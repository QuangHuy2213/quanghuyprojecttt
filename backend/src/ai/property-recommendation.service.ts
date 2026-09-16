import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';

import {
  AiAnalysisResult,
  AiFilters,
  AiMatchType,
  AiPropertySuggestion,
} from './types/ai-response.type';


// =========================================================
// INTERNAL TYPES
// =========================================================

type TransactionType =
  | 'SALE'
  | 'RENT';


type ResolvedLocation = {
  cityCode?: string;

  cityName?: string;

  districtCode?: string;

  districtName?: string;
};


type SearchStage =
  | 'EXACT_DISTRICT'
  | 'RELAXED_DISTRICT'
  | 'WIDE_DISTRICT'
  | 'EXACT_CITY'
  | 'RELAXED_CITY'
  | 'WIDE_CITY'
  | 'GLOBAL_EXACT'
  | 'GLOBAL_RELAXED';


type SearchOptions = {
  filters:
    AiFilters;

  transactionType?:
    TransactionType;

  location:
    ResolvedLocation;

  stage:
    SearchStage;
};


export type PropertySearchResult = {
  recommendations:
    AiPropertySuggestion[];

  matchType:
    AiMatchType;

  matchedStage?:
    string;

  resolvedLocation:
    ResolvedLocation;
};


// =========================================================
// SERVICE
// =========================================================

@Injectable()
export class PropertyRecommendationService {

  private readonly logger =
    new Logger(
      PropertyRecommendationService.name,
    );


  constructor(
    private readonly prisma:
      PrismaService,
  ) {}


  // =======================================================
  // SEARCH
  // =======================================================

  async search(
    analysis:
      AiAnalysisResult,
  ): Promise<PropertySearchResult> {

    const filters =
      analysis.filters;


    // =====================================================
    // 1. SALE / RENT
    // =====================================================

    const transactionType =
      this.resolveTransactionType(
        analysis,
      );


    // =====================================================
    // 2. LOCATION
    // =====================================================

    const location =
      await this.resolveLocation(
        filters,
      );


    this.logger.debug(
      [
        'AI SEARCH',
        `intent=${analysis.intent}`,
        `transaction=${transactionType ?? 'ANY'}`,
        `district=${location.districtName ?? 'NONE'}`,
        `city=${location.cityName ?? 'NONE'}`,
        `maxPrice=${filters.maxPrice ?? 'NONE'}`,
        `minArea=${filters.minArea ?? 'NONE'}`,
      ].join(' | '),
    );


    // =====================================================
    // 3. KIỂM TRA DỮ LIỆU
    // =====================================================

    const baseWhere:
      any =
      {
        status:
          'ACTIVE',
      };


    if (
      transactionType
    ) {

      baseWhere.transactionType =
        transactionType;
    }


    const totalAvailable =
      await this.prisma.posts.count({
        where:
          baseWhere,
      });


    this.logger.debug(
      `AI DB available=${totalAvailable}`,
    );


    if (
      totalAvailable === 0
    ) {

      return {
        recommendations: [],

        matchType:
          'NO_MATCH',

        resolvedLocation:
          location,
      };
    }


    // =====================================================
    // 4. SEARCH STAGES
    // =====================================================

    const stages:
      SearchStage[] =
      [];


    // -----------------------------------------------------
    // Có district
    // -----------------------------------------------------

    if (
      location.districtCode
    ) {

      stages.push(
        'EXACT_DISTRICT',
        'RELAXED_DISTRICT',
        'WIDE_DISTRICT',
      );


      // Nếu district không có,
      // mới mở rộng trong cùng city.
      if (
        location.cityCode
      ) {

        stages.push(
          'EXACT_CITY',
          'RELAXED_CITY',
          'WIDE_CITY',
        );
      }
    }


    // -----------------------------------------------------
    // Chỉ có city
    // -----------------------------------------------------

    else if (
      location.cityCode
    ) {

      stages.push(
        'EXACT_CITY',
        'RELAXED_CITY',
        'WIDE_CITY',
      );
    }


    // -----------------------------------------------------
    // Không có location
    // -----------------------------------------------------

    else {

      stages.push(
        'GLOBAL_EXACT',
        'GLOBAL_RELAXED',
      );
    }


    // =====================================================
    // 5. RUN SEARCH
    // =====================================================

    let posts:
      any[] =
      [];


    let matchedStage:
      SearchStage |
      undefined;


    for (
      const stage
      of stages
    ) {

      const where =
        this.buildWhere({
          filters,
          transactionType,
          location,
          stage,
        });


      this.logger.debug(
        `AI stage=${stage} | where=${this.safeStringify(
          where,
        )}`,
      );


      posts =
        await this.queryPosts(
          where,
        );


      this.logger.debug(
        `AI stage=${stage} | results=${posts.length}`,
      );


      if (
        posts.length > 0
      ) {

        matchedStage =
          stage;

        break;
      }
    }


    // =====================================================
    // 6. NO MATCH
    // =====================================================

    if (
      posts.length === 0 ||
      !matchedStage
    ) {

      return {
        recommendations: [],

        matchType:
          'NO_MATCH',

        resolvedLocation:
          location,
      };
    }


    // =====================================================
    // 7. MATCH TYPE
    // =====================================================

    const matchType =
      this.resolveMatchType(
        matchedStage,
        filters,
      );


    // =====================================================
    // 8. MAP + SCORE
    // =====================================================

    const recommendations =
      posts

        .map(
          (
            post,
          ): AiPropertySuggestion => {

            const price =
              Number(
                post.price,
              );


            const area =
              Number(
                post.area,
              );


            const score =
              this.calculateScore({

                post: {

                  title:
                    post.title,

                  content:
                    post.content,

                  ward:
                    post.ward,

                  addressDetail:
                    post.addressDetail,

                  cityCode:
                    post.city,

                  districtCode:
                    post.district,

                  price,

                  area,

                  bedrooms:
                    post.bedrooms,

                  bathrooms:
                    post.bathrooms,

                  createdAt:
                    post.createdAt,
                },


                filters,

                location,
              });


            return {

              id:
                post.id,

              title:
                post.title,

              thumbnail:
                post.thumbnail,

              images:
                post.images?.map(
                  (
                    image: {
                      url: string;
                    },
                  ) =>
                    image.url,
                ) ?? [],

              price,

              area,

              transactionType:
                post.transactionType,

              city:
                post.cities?.name ??
                null,

              district:
                post.districts?.name ??
                null,

              ward:
                post.ward ??
                null,

              addressDetail:
                post.addressDetail ??
                null,

              bedrooms:
                post.bedrooms ??
                null,

              bathrooms:
                post.bathrooms ??
                null,

              sellerName:
                post.sellerName ??
                null,

              score,
            };
          },
        )


        // =================================================
        // SORT
        // =================================================

        .sort(
          (
            a,
            b,
          ) => {

            if (
              b.score !==
              a.score
            ) {

              return (
                b.score -
                a.score
              );
            }


            // Nếu bằng score,
            // ưu tiên giá gần ngân sách.
            if (
              filters.maxPrice !==
              undefined
            ) {

              const aDiff =
                Math.abs(
                  a.price -
                  filters.maxPrice,
                );


              const bDiff =
                Math.abs(
                  b.price -
                  filters.maxPrice,
                );


              return (
                aDiff -
                bDiff
              );
            }


            return 0;
          },
        )


        // =================================================
        // MAX 6
        // =================================================

        .slice(
          0,
          6,
        );


    // =====================================================
    // 9. RESULT
    // =====================================================

    return {

      recommendations,

      matchType,

      matchedStage,

      resolvedLocation:
        location,
    };
  }


  // =======================================================
  // MATCH TYPE
  // =======================================================

  private resolveMatchType(
    stage:
      SearchStage,

    filters:
      AiFilters,
  ): AiMatchType {

    // =====================================================
    // USER CÓ DISTRICT
    // =====================================================

    if (
      filters.district
    ) {

      if (
        stage ===
        'EXACT_DISTRICT'
      ) {

        return 'EXACT_MATCH';
      }


      return 'NEAR_MATCH';
    }


    // =====================================================
    // USER CÓ CITY
    // =====================================================

    if (
      filters.city
    ) {

      if (
        stage ===
        'EXACT_CITY'
      ) {

        return 'EXACT_MATCH';
      }


      return 'NEAR_MATCH';
    }


    // =====================================================
    // KHÔNG LOCATION
    // =====================================================

    if (
      stage ===
      'GLOBAL_EXACT'
    ) {

      return 'EXACT_MATCH';
    }


    return 'NEAR_MATCH';
  }


  // =======================================================
  // QUERY
  // =======================================================

  private async queryPosts(
    where:
      any,
  ) {

    return this.prisma.posts
      .findMany({

        where,

        take:
          50,

        orderBy: [
          {
            createdAt:
              'desc',
          },
        ],

        include: {

          cities:
            true,

          districts:
            true,

          images: {
            take:
              5,
          },
        },
      });
  }


  // =======================================================
  // TRANSACTION TYPE
  // =======================================================

  private resolveTransactionType(
    analysis:
      AiAnalysisResult,
  ): TransactionType | undefined {

    if (
      analysis.intent ===
      'BUY_PROPERTY'
    ) {

      return 'SALE';
    }


    if (
      analysis.intent ===
      'RENT_PROPERTY'
    ) {

      return 'RENT';
    }


    if (
      analysis.intent ===
        'FINANCIAL_ADVICE' &&

      (
        analysis.filters
          .desiredTransaction ===
          'SALE' ||

        analysis.filters
          .desiredTransaction ===
          'RENT'
      )
    ) {

      return analysis.filters
        .desiredTransaction;
    }


    return undefined;
  }


  // =======================================================
  // RESOLVE LOCATION
  // =======================================================

  private async resolveLocation(
    filters:
      AiFilters,
  ): Promise<ResolvedLocation> {

    const result:
      ResolvedLocation =
      {};


    // =====================================================
    // DISTRICT
    // =====================================================

    if (
      filters.district
    ) {

      const original =
        filters.district
          .trim();


      const cleaned =
        this.cleanLocationName(
          original,
        );


      const values =
        Array.from(
          new Set(
            [
              original,
              cleaned,
            ]

              .map(
                (
                  value,
                ) =>
                  value.trim(),
              )

              .filter(
                Boolean,
              ),
          ),
        );


      let district =
        await this.prisma
          .districts
          .findFirst({

            where: {

              OR:
                values.flatMap(
                  (
                    value,
                  ) => [

                    {
                      name: {

                        contains:
                          value,

                        mode:
                          'insensitive',
                      },
                    },

                    {
                      name_with_type: {

                        contains:
                          value,

                        mode:
                          'insensitive',
                      },
                    },
                  ],
                ),
            },

            select: {

              code:
                true,

              name:
                true,

              name_with_type:
                true,

              parent_code:
                true,
            },
          });


      // ===================================================
      // NORMALIZED FALLBACK
      // ===================================================

      if (!district) {

        const allDistricts =
          await this.prisma
            .districts
            .findMany({

              select: {

                code:
                  true,

                name:
                  true,

                name_with_type:
                  true,

                parent_code:
                  true,
              },
            });


        const target =
          this.normalizeText(
            cleaned,
          );


        district =
          allDistricts.find(
            (
              item,
            ) => {

              const name =
                this.normalizeText(
                  item.name,
                );


              const fullName =
                this.normalizeText(
                  item.name_with_type ??
                  '',
                );


              return (

                name ===
                  target ||

                name.includes(
                  target,
                ) ||

                fullName.includes(
                  target,
                )
              );
            },
          ) ?? null;
      }


      if (district) {

        result.districtCode =
          district.code;

        result.districtName =
          district.name;


        if (
          district.parent_code
        ) {

          result.cityCode =
            district.parent_code;


          const city =
            await this.prisma
              .cities
              .findUnique({

                where: {

                  code:
                    district
                      .parent_code,
                },

                select: {

                  code:
                    true,

                  name:
                    true,
                },
              });


          if (city) {

            result.cityCode =
              city.code;

            result.cityName =
              city.name;
          }
        }
      }
    }


    // =====================================================
    // CITY
    // =====================================================

    if (
      filters.city &&
      !result.cityCode
    ) {

      const original =
        filters.city
          .trim();


      const cleaned =
        this.cleanLocationName(
          original,
        );


      const values =
        Array.from(
          new Set(
            [
              original,
              cleaned,
            ]

              .map(
                (
                  value,
                ) =>
                  value.trim(),
              )

              .filter(
                Boolean,
              ),
          ),
        );


      let city =
        await this.prisma
          .cities
          .findFirst({

            where: {

              OR:
                values.flatMap(
                  (
                    value,
                  ) => [

                    {
                      name: {

                        contains:
                          value,

                        mode:
                          'insensitive',
                      },
                    },

                    {
                      name_with_type: {

                        contains:
                          value,

                        mode:
                          'insensitive',
                      },
                    },
                  ],
                ),
            },

            select: {

              code:
                true,

              name:
                true,

              name_with_type:
                true,
            },
          });


      // ===================================================
      // NORMALIZED FALLBACK
      // ===================================================

      if (!city) {

        const allCities =
          await this.prisma
            .cities
            .findMany({

              select: {

                code:
                  true,

                name:
                  true,

                name_with_type:
                  true,
              },
            });


        const target =
          this.normalizeText(
            cleaned,
          );


        city =
          allCities.find(
            (
              item,
            ) => {

              const name =
                this.normalizeText(
                  item.name,
                );


              const fullName =
                this.normalizeText(
                  item.name_with_type ??
                  '',
                );


              return (

                name ===
                  target ||

                name.includes(
                  target,
                ) ||

                fullName.includes(
                  target,
                )
              );
            },
          ) ?? null;
      }


      if (city) {

        result.cityCode =
          city.code;

        result.cityName =
          city.name;
      }
    }


    // =====================================================
    // DEBUG
    // =====================================================

    this.logger.debug(
      [
        'AI LOCATION',
        `requestedDistrict=${filters.district ?? 'NONE'}`,
        `districtCode=${result.districtCode ?? 'NONE'}`,
        `districtName=${result.districtName ?? 'NONE'}`,
        `requestedCity=${filters.city ?? 'NONE'}`,
        `cityCode=${result.cityCode ?? 'NONE'}`,
        `cityName=${result.cityName ?? 'NONE'}`,
      ].join(' | '),
    );


    return result;
  }


  // =======================================================
  // BUILD WHERE
  // =======================================================

  private buildWhere(
    options:
      SearchOptions,
  ): any {

    const {
      filters,
      transactionType,
      location,
      stage,
    } =
      options;


    const where:
      any =
      {

        status:
          'ACTIVE',
      };


    // =====================================================
    // SALE / RENT
    // =====================================================

    if (
      transactionType
    ) {

      where.transactionType =
        transactionType;
    }


    // =====================================================
    // DISTRICT STAGES
    // =====================================================

    if (
      stage ===
        'EXACT_DISTRICT' ||

      stage ===
        'RELAXED_DISTRICT' ||

      stage ===
        'WIDE_DISTRICT'
    ) {

      if (
        location.districtCode
      ) {

        where.district =
          location.districtCode;
      }
    }


    // =====================================================
    // CITY STAGES
    // =====================================================

    if (
      stage ===
        'EXACT_CITY' ||

      stage ===
        'RELAXED_CITY' ||

      stage ===
        'WIDE_CITY'
    ) {

      if (
        location.cityCode
      ) {

        where.city =
          location.cityCode;
      }
    }


    // =====================================================
    // RELAX RATIOS
    // =====================================================

    let minRatio =
      1;

    let maxRatio =
      1;


    // -----------------------------------------------------
    // RELAXED
    //
    // maxPrice +20%
    // minArea -20%
    // -----------------------------------------------------

    if (
      stage ===
        'RELAXED_DISTRICT' ||

      stage ===
        'RELAXED_CITY' ||

      stage ===
        'GLOBAL_RELAXED'
    ) {

      minRatio =
        0.8;

      maxRatio =
        1.2;
    }


    // -----------------------------------------------------
    // WIDE
    //
    // maxPrice +50%
    // minArea -30%
    // -----------------------------------------------------

    if (
      stage ===
        'WIDE_DISTRICT' ||

      stage ===
        'WIDE_CITY'
    ) {

      minRatio =
        0.7;

      maxRatio =
        1.5;
    }


    // =====================================================
    // PRICE
    // =====================================================

    if (
      filters.minPrice !==
        undefined ||

      filters.maxPrice !==
        undefined
    ) {

      where.price =
        {};


      if (
        filters.minPrice !==
        undefined
      ) {

        where.price.gte =
          Math.max(
            0,

            Math.round(
              filters.minPrice *
              minRatio,
            ),
          );
      }


      if (
        filters.maxPrice !==
        undefined
      ) {

        where.price.lte =
          Math.round(
            filters.maxPrice *
            maxRatio,
          );
      }
    }


    // =====================================================
    // AREA
    // =====================================================

    if (
      filters.minArea !==
        undefined ||

      filters.maxArea !==
        undefined
    ) {

      where.area =
        {};


      if (
        filters.minArea !==
        undefined
      ) {

        where.area.gte =
          Math.max(
            0,

            filters.minArea *
            minRatio,
          );
      }


      if (
        filters.maxArea !==
        undefined
      ) {

        where.area.lte =
          filters.maxArea *
          maxRatio;
      }
    }


    // =====================================================
    // BEDROOM
    // =====================================================

    if (
      filters.bedrooms !==
      undefined
    ) {

      const relaxed =
        this.isRelaxedStage(
          stage,
        );


      where.bedrooms =
        {

          gte:
            Math.max(
              0,

              Math.floor(
                filters.bedrooms -
                (
                  relaxed
                    ? 1
                    : 0
                ),
              ),
            ),
        };
    }


    // =====================================================
    // BATHROOM
    // =====================================================

    if (
      filters.bathrooms !==
      undefined
    ) {

      const relaxed =
        this.isRelaxedStage(
          stage,
        );


      where.bathrooms =
        {

          gte:
            Math.max(
              0,

              Math.floor(
                filters.bathrooms -
                (
                  relaxed
                    ? 1
                    : 0
                ),
              ),
            ),
        };
    }


    // =====================================================
    // KEYWORD
    //
    // Không dùng keyword làm hard filter.
    // Chỉ dùng để cộng score.
    // =====================================================


    return where;
  }


  // =======================================================
  // RELAXED STAGE
  // =======================================================

  private isRelaxedStage(
    stage:
      SearchStage,
  ): boolean {

    return (

      stage ===
        'RELAXED_DISTRICT' ||

      stage ===
        'WIDE_DISTRICT' ||

      stage ===
        'RELAXED_CITY' ||

      stage ===
        'WIDE_CITY' ||

      stage ===
        'GLOBAL_RELAXED'
    );
  }


  // =======================================================
  // SCORE
  // =======================================================

  private calculateScore(
    options: {

      post: {

        title:
          string;

        content:
          string | null;

        ward:
          string | null;

        addressDetail:
          string | null;

        cityCode:
          string | null;

        districtCode:
          string | null;

        price:
          number;

        area:
          number;

        bedrooms:
          number | null;

        bathrooms:
          number | null;

        createdAt:
          Date;
      };


      filters:
        AiFilters;


      location:
        ResolvedLocation;
    },
  ): number {

    const {
      post,
      filters,
      location,
    } =
      options;


    let score =
      30;


    // =====================================================
    // LOCATION SCORE
    // =====================================================

    if (
      location.districtCode
    ) {

      if (
        post.districtCode ===
        location.districtCode
      ) {

        score +=
          30;

      } else if (
        location.cityCode &&
        post.cityCode ===
          location.cityCode
      ) {

        score +=
          12;

      } else {

        score -=
          15;
      }

    } else if (
      location.cityCode &&
      post.cityCode ===
        location.cityCode
    ) {

      score +=
        20;
    }


    // =====================================================
    // PRICE SCORE
    // =====================================================

    if (
      filters.maxPrice !==
        undefined &&

      filters.maxPrice > 0
    ) {

      if (
        post.price <=
        filters.maxPrice
      ) {

        const ratio =
          post.price /
          filters.maxPrice;


        score +=
          Math.max(
            8,

            20 -
            Math.abs(
              1 -
              ratio,
            ) *
            14,
          );

      } else {

        const over =
          (
            post.price -
            filters.maxPrice
          ) /
          filters.maxPrice;


        if (
          over <= 0.1
        ) {

          score -=
            3;

        } else if (
          over <= 0.2
        ) {

          score -=
            7;

        } else if (
          over <= 0.5
        ) {

          score -=
            15;

        } else {

          score -=
            30;
        }
      }
    }


    // =====================================================
    // MIN PRICE
    // =====================================================

    if (
      filters.minPrice !==
        undefined
    ) {

      if (
        post.price >=
        filters.minPrice
      ) {

        score +=
          3;

      } else {

        score -=
          3;
      }
    }


    // =====================================================
    // AREA SCORE
    // =====================================================

    if (
      filters.minArea !==
        undefined &&

      filters.minArea > 0
    ) {

      if (
        post.area >=
        filters.minArea
      ) {

        score +=
          15;

      } else {

        const ratio =
          post.area /
          filters.minArea;


        if (
          ratio >= 0.9
        ) {

          score -=
            2;

        } else if (
          ratio >= 0.8
        ) {

          score -=
            5;

        } else if (
          ratio >= 0.7
        ) {

          score -=
            10;

        } else {

          score -=
            20;
        }
      }
    }


    // =====================================================
    // MAX AREA
    // =====================================================

    if (
      filters.maxArea !==
        undefined
    ) {

      if (
        post.area <=
        filters.maxArea
      ) {

        score +=
          3;

      } else {

        score -=
          3;
      }
    }


    // =====================================================
    // BEDROOM
    // =====================================================

    if (
      filters.bedrooms !==
        undefined
    ) {

      if (
        post.bedrooms !==
          null &&

        post.bedrooms >=
          filters.bedrooms
      ) {

        score +=
          7;

      } else {

        score -=
          5;
      }
    }


    // =====================================================
    // BATHROOM
    // =====================================================

    if (
      filters.bathrooms !==
        undefined
    ) {

      if (
        post.bathrooms !==
          null &&

        post.bathrooms >=
          filters.bathrooms
      ) {

        score +=
          5;

      } else {

        score -=
          3;
      }
    }


    // =====================================================
    // KEYWORD
    // =====================================================

    if (
      filters.keyword
    ) {

      const keyword =
        this.normalizeText(
          filters.keyword,
        );


      const searchable =
        this.normalizeText(
          [
            post.title,
            post.content,
            post.ward,
            post.addressDetail,
          ]

            .filter(
              Boolean,
            )

            .join(
              ' ',
            ),
        );


      if (
        keyword &&
        searchable.includes(
          keyword,
        )
      ) {

        score +=
          8;
      }
    }


    // =====================================================
    // RECENCY
    // =====================================================

    const ageDays =
      Math.max(
        0,

        (
          Date.now() -
          post.createdAt
            .getTime()
        ) /

        (
          1000 *
          60 *
          60 *
          24
        ),
      );


    if (
      ageDays <= 3
    ) {

      score +=
        5;

    } else if (
      ageDays <= 30
    ) {

      score +=
        3;

    } else if (
      ageDays <= 90
    ) {

      score +=
        1;
    }


    // =====================================================
    // CLAMP 0 - 100
    // =====================================================

    return Math.max(
      0,

      Math.min(
        100,

        Math.round(
          score,
        ),
      ),
    );
  }


  // =======================================================
  // CLEAN LOCATION
  // =======================================================

  private cleanLocationName(
    value:
      string,
  ): string {

    return value

      .trim()

      .replace(
        /^(thành phố|tp\.?|quận|huyện|thị xã|thị trấn)\s+/i,
        '',
      )

      .trim();
  }


  // =======================================================
  // NORMALIZE TEXT
  // =======================================================

  private normalizeText(
    value:
      string,
  ): string {

    return value

      .normalize(
        'NFD',
      )

      .replace(
        /[\u0300-\u036f]/g,
        '',
      )

      .replace(
        /đ/g,
        'd',
      )

      .replace(
        /Đ/g,
        'D',
      )

      .toLowerCase()

      .replace(
        /[^a-z0-9\s]/g,
        ' ',
      )

      .replace(
        /\s+/g,
        ' ',
      )

      .trim();
  }


  // =======================================================
  // SAFE STRINGIFY
  // =======================================================

  private safeStringify(
    value:
      unknown,
  ): string {

    try {

      return JSON.stringify(
        value,
      );

    } catch {

      return '[unserializable]';
    }
  }
}