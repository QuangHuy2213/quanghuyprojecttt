import PostList from '@/components/PostList';

export default function Home() {
  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <PostList />
    </main>
  );
}