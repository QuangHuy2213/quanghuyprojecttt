import {
  Injectable,
} from '@nestjs/common';

import {
  SYSTEM_KNOWLEDGE,
  SystemKnowledgeItem,
} from './knowledge/system-knowledge';


@Injectable()
export class SystemHelpService {

  // =======================================================
  // SEARCH
  // =======================================================

  search(
    question:
      string,
  ): SystemKnowledgeItem | null {

    const normalizedQuestion =
      this.normalize(
        question,
      );


    if (
      !normalizedQuestion
    ) {
      return null;
    }


    let bestItem:
      SystemKnowledgeItem | null =
      null;


    let bestScore =
      0;


    for (
      const item
      of SYSTEM_KNOWLEDGE
    ) {

      const score =
        this.calculateScore(
          normalizedQuestion,
          item,
        );


      if (
        score >
        bestScore
      ) {

        bestScore =
          score;

        bestItem =
          item;
      }
    }


    // Không đủ tin cậy thì không tự đoán.
    if (
      bestScore <
      50
    ) {
      return null;
    }


    return bestItem;
  }


  // =======================================================
  // CALCULATE SCORE
  // =======================================================

  private calculateScore(
    question:
      string,

    item:
      SystemKnowledgeItem,
  ): number {

    let bestScore =
      0;


    const questionTokens =
      new Set(
        question
          .split(' ')
          .filter(Boolean),
      );


    for (
      const keyword
      of item.keywords
    ) {

      const normalizedKeyword =
        this.normalize(
          keyword,
        );


      if (
        !normalizedKeyword
      ) {
        continue;
      }


      // ===================================================
      // EXACT PHRASE
      // ===================================================

      if (
        question.includes(
          normalizedKeyword,
        )
      ) {

        bestScore =
          Math.max(
            bestScore,

            100 +
            normalizedKeyword.length,
          );


        continue;
      }


      // ===================================================
      // TOKEN MATCH
      // ===================================================

      const keywordTokens =
        normalizedKeyword
          .split(' ')
          .filter(Boolean);


      if (
        keywordTokens.length <
        2
      ) {
        continue;
      }


      let matchedTokens =
        0;


      for (
        const token
        of keywordTokens
      ) {

        if (
          questionTokens.has(
            token,
          )
        ) {
          matchedTokens++;
        }
      }


      const ratio =
        matchedTokens /
        keywordTokens.length;


      if (
        ratio >=
        0.75
      ) {

        bestScore =
          Math.max(
            bestScore,

            Math.round(
              50 *
              ratio,
            ),
          );
      }
    }


    return bestScore;
  }


  // =======================================================
  // NORMALIZE
  // =======================================================

  private normalize(
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
}