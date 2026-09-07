// Small transactional store for service tests; it never connects to a real database.
export function workflowFixture() {
  const data: Record<string, any[]> = {
    posts: [
      {
        id: 1,
        title: 'Căn hộ thử nghiệm',
        userId: 'seller',
        status: 'ACTIVE',
        approvedAt: new Date(),
        price: 1_000_000_000,
        posterType: 'OWNER',
        transactionType: 'SALE',
        brokerCommission: 0,
        updatedAt: new Date(),
      },
    ],
    user: [
      { id: 'seller', role: 'AGENT', phoneNumber: '0900000001', fullName: 'Người bán' },
      { id: 'buyer', role: 'USER', phoneNumber: '0900000002', fullName: 'Khách hàng' },
      { id: 'other', role: 'USER', phoneNumber: '0900000003', fullName: 'Khách khác' },
      { id: 'admin', role: 'ADMIN' },
    ],
    transaction: [],
    invoice: [],
    notification: [],
    follow: [],
    message: [],
  };
  let sequence = 0;
  const matches = (record: any, where: any = {}): boolean =>
    Object.entries(where).every(([key, value]: [string, any]) => {
      if (key === 'OR') return value.some((part: any) => matches(record, part));
      if (key === 'AND') return value.every((part: any) => matches(record, part));
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        if ('in' in value) return value.in.includes(record[key]);
        if ('not' in value) return record[key] !== value.not;
        if ('gte' in value) return record[key] >= value.gte;
        if ('lte' in value) return record[key] <= value.lte;
        if ('lt' in value) return record[key] < value.lt;
        return matches(record, value); // compound unique key
      }
      return record[key] === value;
    });
  const hydrate = (name: string, record: any): any => {
    if (!record) return null;
    const value = { ...record };
    if (name === 'transaction') {
      value.post = { ...data.posts.find((post) => post.id === record.postId) };
      value.invoice =
        data.invoice.find((invoice) => invoice.transactionId === record.id) || null;
    }
    if (name === 'invoice')
      value.transaction = hydrate(
        'transaction',
        data.transaction.find((tx) => tx.id === record.transactionId),
      );
    return value;
  };
  const db: any = { $queryRaw: jest.fn().mockResolvedValue([]) };
  for (const name of Object.keys(data)) {
    const find = (where: any) => data[name].find((row) => matches(row, where));
    db[name] = {
      findUnique: jest.fn(async ({ where }: any) => hydrate(name, find(where))),
      findUniqueOrThrow: jest.fn(async ({ where }: any) => {
        const row = find(where);
        if (!row) throw new Error('Missing fixture row');
        return hydrate(name, row);
      }),
      findFirst: jest.fn(async ({ where }: any) => hydrate(name, find(where))),
      findMany: jest.fn(async ({ where = {} } = {}) =>
        data[name].filter((row) => matches(row, where)).map((row) => hydrate(name, row)),
      ),
      count: jest.fn(
        async ({ where }: any) => data[name].filter((row) => matches(row, where)).length,
      ),
      create: jest.fn(async ({ data: fields }: any) => {
        const row = {
          id: `${name}-${++sequence}`,
          buyerConfirmed: null,
          sellerConfirmed: null,
          negotiatedAt: null,
          saleRequestedAt: null,
          completedAt: null,
          updatedAt: new Date(),
          ...fields,
        };
        data[name].push(row);
        return hydrate(name, row);
      }),
      update: jest.fn(async ({ where, data: changes }: any) => {
        const row = find(where);
        if (!row) throw new Error('Missing fixture row');
        Object.assign(row, changes, { updatedAt: new Date() });
        return hydrate(name, row);
      }),
      updateMany: jest.fn(async ({ where, data: changes }: any) => {
        const rows = data[name].filter((row) => matches(row, where));
        rows.forEach((row) => Object.assign(row, changes, { updatedAt: new Date() }));
        return { count: rows.length };
      }),
      upsert: jest.fn(async ({ where, update, create }: any) =>
        find(where)
          ? db[name].update({ where, data: update })
          : db[name].create({ data: create }),
      ),
      createMany: jest.fn(async ({ data: rows }: any) => {
        for (const row of rows)
          if (!row.eventKey || !find({ eventKey: row.eventKey }))
            await db[name].create({ data: row });
        return { count: rows.length };
      }),
      delete: jest.fn(async ({ where }: any) => {
        const row = find(where);
        data[name] = data[name].filter((item) => item !== row);
        return row;
      }),
    };
  }
  let tail = Promise.resolve();
  db.$transaction = jest.fn((action: (client: any) => Promise<unknown>) => {
    const work = tail.then(async () => {
      const snapshot = structuredClone(data);
      try {
        return await action(db);
      } catch (error) {
        Object.assign(data, snapshot);
        throw error;
      }
    });
    tail = work.catch(() => undefined) as Promise<void>;
    return work;
  });
  return { db, data };
}
