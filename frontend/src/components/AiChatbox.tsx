'use client';

import Link from 'next/link';

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import styles from './AiChatbox.module.css';


// =========================================================
// TYPES
// =========================================================

type AiIntent =
  | 'BUY_PROPERTY'
  | 'RENT_PROPERTY'
  | 'FINANCIAL_ADVICE'
  | 'SYSTEM_HELP'
  | 'GENERAL_SUPPORT';


type AiMatchType =
  | 'EXACT_MATCH'
  | 'NEAR_MATCH'
  | 'NO_MATCH';


type AiFilters = {
  city?: string;
  district?: string;

  maxPrice?: number;
  minPrice?: number;

  minArea?: number;
  maxArea?: number;

  bedrooms?: number;
  bathrooms?: number;

  keyword?: string;

  monthlyIncome?: number;

  desiredTransaction?:
    | 'SALE'
    | 'RENT';
};


type AiPropertySuggestion = {
  id: number;

  title: string;

  thumbnail:
    | string
    | null;

  images:
    string[];

  price: number;

  area: number;

  transactionType: string;

  city:
    | string
    | null;

  district:
    | string
    | null;

  ward:
    | string
    | null;

  addressDetail:
    | string
    | null;

  bedrooms:
    | number
    | null;

  bathrooms:
    | number
    | null;

  sellerName:
    | string
    | null;

  score: number;
};


type AiFinancialGuidance = {
  monthlyIncome: number;

  suggestedHousingBudget: number;

  upperHousingBudget: number;

  note: string;
};


type AiSystemHelp = {
  topic: string;

  title: string;

  description: string;

  steps: string[];
};


type AiAction = {
  label: string;

  route: string;
};


type AiChatResponse = {
  success: boolean;

  intent: AiIntent;

  message: string;

  filters: AiFilters;

  recommendations:
    AiPropertySuggestion[];

  matchType?:
    AiMatchType;

  matchNote?:
    string;

  financialGuidance?:
    AiFinancialGuidance;

  systemHelp?:
    AiSystemHelp;

  action?:
    AiAction;

  clarificationNeeded:
    boolean;

  clarificationQuestion?:
    string;
};


type ChatMessage = {
  id: string;

  role:
    | 'user'
    | 'assistant';

  text: string;

  response?:
    AiChatResponse;
};


// =========================================================
// CONFIG
// =========================================================

const GATEWAY_URL =
  (
    process.env
      .NEXT_PUBLIC_SECURITY_GATEWAY_URL ||
    'http://127.0.0.1:8000'
  ).replace(/\/$/, '');


const QUICK_PROMPTS = [
  'Tôi có 2 tỷ, muốn mua nhà ở Thủ Đức, diện tích trên 60m2',

  'Tôi muốn thuê phòng ở Quận 7 dưới 5 triệu',

  'Tôi muốn đổi mật khẩu',

  'Làm sao để đăng tin bất động sản?',

  'Tôi muốn xem giao dịch của mình',
];


// =========================================================
// COMPONENT
// =========================================================

export default function AiChatbox() {

  const [open, setOpen] =
    useState(false);


  const [messages, setMessages] =
    useState<ChatMessage[]>([
      {
        id:
          'welcome',

        role:
          'assistant',

        text:
          'Xin chào! Mình có thể hỗ trợ tìm bất động sản, tham khảo ngân sách và hướng dẫn bạn sử dụng các chức năng trên hệ thống.',
      },
    ]);


  const [input, setInput] =
    useState('');


  const [loading, setLoading] =
    useState(false);


  const [error, setError] =
    useState<string | null>(
      null,
    );


  const bottomRef =
    useRef<HTMLDivElement | null>(
      null,
    );


  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null,
    );


  // =======================================================
  // AUTO SCROLL
  // =======================================================

  useEffect(() => {

    if (!open) {
      return;
    }


    bottomRef.current
      ?.scrollIntoView({
        behavior:
          'smooth',
      });

  }, [
    messages,
    loading,
    open,
  ]);


  // =======================================================
  // AUTO FOCUS
  // =======================================================

  useEffect(() => {

    if (!open) {
      return;
    }


    const timeout =
      window.setTimeout(
        () => {

          textareaRef.current
            ?.focus();
        },
        150,
      );


    return () => {

      window.clearTimeout(
        timeout,
      );
    };

  }, [
    open,
  ]);


  // =======================================================
  // CLIENT ID
  // =======================================================

  function getClientId():
    string {

    if (
      typeof window ===
      'undefined'
    ) {

      return 'web-client';
    }


    const key =
      'ai_chat_client_id';


    const existing =
      localStorage.getItem(
        key,
      );


    if (existing) {
      return existing;
    }


    const id =

      typeof crypto !==
        'undefined' &&

      'randomUUID' in crypto

        ? crypto.randomUUID()

        : `web-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;


    localStorage.setItem(
      key,
      id,
    );


    return id;
  }


  // =======================================================
  // SEND MESSAGE
  // =======================================================

  async function sendMessage(
    rawMessage?: string,
  ) {

    const message =
      (
        rawMessage ??
        input
      ).trim();


    if (
      !message ||
      loading
    ) {
      return;
    }


    setError(
      null,
    );


    setInput(
      '',
    );


    const userMessage:
      ChatMessage = {

        id:
          `user-${Date.now()}`,

        role:
          'user',

        text:
          message,
      };


    setMessages(
      (
        previous,
      ) => [
        ...previous,
        userMessage,
      ],
    );


    setLoading(
      true,
    );


    try {

      const response =
        await fetch(
          `${GATEWAY_URL}/api/ai/chat`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json; charset=utf-8',

              'X-Client-Id':
                getClientId(),
            },

            body:
              JSON.stringify({
                message,
              }),
          },
        );


      let data:
        | AiChatResponse
        | {
            message?: string;
            error?: string;
          };


      try {

        data =
          await response.json();

      } catch {

        throw new Error(
          'Server trả về dữ liệu không hợp lệ.',
        );
      }


      if (
        !response.ok
      ) {

        const serverMessage =

          'message' in data &&
          typeof data.message ===
            'string'

            ? data.message

            : `Không thể gửi yêu cầu (${response.status}).`;


        throw new Error(
          serverMessage,
        );
      }


      const result =
        data as
          AiChatResponse;


      const assistantMessage:
        ChatMessage = {

        id:
          `assistant-${Date.now()}`,

        role:
          'assistant',

        text:
          result.message,

        response:
          result,
      };


      setMessages(
        (
          previous,
        ) => [
          ...previous,
          assistantMessage,
        ],
      );


      if (
        result.clarificationNeeded &&
        result.clarificationQuestion
      ) {

        setMessages(
          (
            previous,
          ) => [
            ...previous,

            {
              id:
                `clarification-${Date.now()}`,

              role:
                'assistant',

              text:
                result.clarificationQuestion!,
            },
          ],
        );
      }

    } catch (
      caughtError
    ) {

      const message =

        caughtError instanceof
        Error

          ? caughtError.message

          : 'Không thể kết nối với trợ lý AI.';


      setError(
        message,
      );


      setMessages(
        (
          previous,
        ) => [
          ...previous,

          {
            id:
              `error-${Date.now()}`,

            role:
              'assistant',

            text:
              'Xin lỗi, hiện tại mình chưa thể xử lý yêu cầu này. Bạn vui lòng thử lại sau.',
          },
        ],
      );

    } finally {

      setLoading(
        false,
      );
    }
  }


  // =======================================================
  // FORM
  // =======================================================

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {

    event.preventDefault();

    void sendMessage();
  }


  function handleKeyDown(
    event:
      KeyboardEvent<HTMLTextAreaElement>,
  ) {

    if (
      event.key ===
        'Enter' &&
      !event.shiftKey
    ) {

      event.preventDefault();

      void sendMessage();
    }
  }


  // =======================================================
  // CLEAR CHAT
  // =======================================================

  function clearChat() {

    setMessages([
      {
        id:
          `welcome-${Date.now()}`,

        role:
          'assistant',

        text:
          'Mình đã tạo cuộc trò chuyện mới. Bạn có thể hỏi về bất động sản, tài chính hoặc cách sử dụng hệ thống.',
      },
    ]);


    setError(
      null,
    );


    setInput(
      '',
    );
  }


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <>

      {!open && (
        <button
          type="button"
          className={
            styles.floatingButton
          }
          onClick={() =>
            setOpen(
              true,
            )
          }
          aria-label="Mở trợ lý AI"
        >
          <span
            className={
              styles.floatingGlow
            }
          />

          <BotIcon />

          <span
            className={
              styles.floatingText
            }
          >
            Trợ lý AI
          </span>
        </button>
      )}


      {open && (
        <section
          className={
            styles.chatWindow
          }
        >

          {/* HEADER */}

          <header
            className={
              styles.header
            }
          >
            <div
              className={
                styles.headerIdentity
              }
            >
              <div
                className={
                  styles.botAvatar
                }
              >
                <BotIcon />
              </div>


              <div>
                <div
                  className={
                    styles.headerTitle
                  }
                >
                  Trợ lý AI Nhà Tốt
                </div>


                <div
                  className={
                    styles.headerStatus
                  }
                >
                  <span
                    className={
                      styles.onlineDot
                    }
                  />

                  Bất động sản · Tài chính · Hướng dẫn hệ thống
                </div>
              </div>
            </div>


            <div
              className={
                styles.headerActions
              }
            >
              <button
                type="button"
                className={
                  styles.iconButton
                }
                onClick={
                  clearChat
                }
                title="Cuộc trò chuyện mới"
              >
                <RefreshIcon />
              </button>


              <button
                type="button"
                className={
                  styles.iconButton
                }
                onClick={() =>
                  setOpen(
                    false,
                  )
                }
                title="Đóng"
              >
                <CloseIcon />
              </button>
            </div>
          </header>


          {/* MESSAGES */}

          <div
            className={
              styles.messages
            }
          >

            {messages.map(
              (
                message,
              ) => (
                <MessageItem
                  key={
                    message.id
                  }
                  message={
                    message
                  }
                />
              ),
            )}


            {messages.length ===
              1 &&
              !loading && (

                <div
                  className={
                    styles.quickPrompts
                  }
                >
                  <div
                    className={
                      styles.quickTitle
                    }
                  >
                    Gợi ý câu hỏi
                  </div>


                  {QUICK_PROMPTS.map(
                    (
                      prompt,
                    ) => (

                      <button
                        type="button"
                        key={
                          prompt
                        }
                        className={
                          styles.quickPrompt
                        }
                        onClick={() =>
                          void sendMessage(
                            prompt,
                          )
                        }
                      >
                        <SparkleIcon />

                        <span>
                          {prompt}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              )}


            {loading && (
              <div
                className={
                  styles.assistantRow
                }
              >
                <div
                  className={
                    styles.smallAvatar
                  }
                >
                  <BotIcon />
                </div>


                <div
                  className={
                    styles.typingBubble
                  }
                >
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}


            {error && (
              <div
                className={
                  styles.errorNotice
                }
              >
                {error}
              </div>
            )}


            <div
              ref={
                bottomRef
              }
            />
          </div>


          {/* INPUT */}

          <form
            className={
              styles.inputArea
            }
            onSubmit={
              handleSubmit
            }
          >
            <div
              className={
                styles.inputWrapper
              }
            >
              <textarea
                ref={
                  textareaRef
                }
                value={
                  input
                }
                onChange={(
                  event,
                ) =>
                  setInput(
                    event.target.value,
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="VD: Tôi muốn đổi mật khẩu hoặc tìm nhà ở Thủ Đức..."
                rows={1}
                maxLength={
                  1500
                }
                disabled={
                  loading
                }
                className={
                  styles.textarea
                }
              />


              <button
                type="submit"
                className={
                  styles.sendButton
                }
                disabled={
                  loading ||
                  !input.trim()
                }
                aria-label="Gửi"
              >
                <SendIcon />
              </button>
            </div>


            <div
              className={
                styles.inputHint
              }
            >
              Enter để gửi · Shift + Enter để xuống dòng
            </div>
          </form>
        </section>
      )}
    </>
  );
}


// =========================================================
// MESSAGE
// =========================================================

function MessageItem({
  message,
}: {
  message:
    ChatMessage;
}) {

  const isUser =
    message.role ===
    'user';


  return (
    <div
      className={
        isUser
          ? styles.userRow
          : styles.assistantRow
      }
    >
      {!isUser && (
        <div
          className={
            styles.smallAvatar
          }
        >
          <BotIcon />
        </div>
      )}


      <div
        className={
          isUser
            ? styles.userContent
            : styles.assistantContent
        }
      >
        <div
          className={
            isUser
              ? styles.userBubble
              : styles.assistantBubble
          }
        >
          {message.text}
        </div>


        {message.response && (
          <AiResponseDetails
            response={
              message.response
            }
          />
        )}
      </div>
    </div>
  );
}


// =========================================================
// RESPONSE DETAILS
// =========================================================

function AiResponseDetails({
  response,
}: {
  response:
    AiChatResponse;
}) {

  return (
    <div
      className={
        styles.responseDetails
      }
    >

      {response.matchType && (
        <MatchBadge
          type={
            response.matchType
          }
        />
      )}


      {response.matchNote && (
        <div
          className={
            styles.matchNote
          }
        >
          <InfoIcon />

          <span>
            {response.matchNote}
          </span>
        </div>
      )}


      <FilterSummary
        filters={
          response.filters
        }
      />


      {response.systemHelp && (
        <SystemHelpCard
          help={
            response.systemHelp
          }
          action={
            response.action
          }
        />
      )}


      {response.financialGuidance && (
        <FinancialCard
          guidance={
            response.financialGuidance
          }
        />
      )}


      {response.recommendations.length >
        0 && (

        <div
          className={
            styles.propertyList
          }
        >
          {response.recommendations.map(
            (
              property,
            ) => (

              <PropertyCard
                key={
                  property.id
                }
                property={
                  property
                }
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}


// =========================================================
// SYSTEM HELP CARD
// =========================================================

function SystemHelpCard({
  help,
  action,
}: {
  help:
    AiSystemHelp;

  action?:
    AiAction;
}) {

  return (
    <div
      className={
        styles.systemHelpCard
      }
    >
      <div
        className={
          styles.systemHelpHeader
        }
      >
        <div
          className={
            styles.systemHelpIcon
          }
        >
          <HelpIcon />
        </div>


        <div>
          <div
            className={
              styles.systemHelpLabel
            }
          >
            Hướng dẫn sử dụng
          </div>

          <h4
            className={
              styles.systemHelpTitle
            }
          >
            {help.title}
          </h4>
        </div>
      </div>


      <p
        className={
          styles.systemHelpDescription
        }
      >
        {help.description}
      </p>


      <ol
        className={
          styles.systemHelpSteps
        }
      >
        {help.steps.map(
          (
            step,
            index,
          ) => (

            <li
              key={`${help.topic}-${index}`}
            >
              <span
                className={
                  styles.stepNumber
                }
              >
                {index + 1}
              </span>

              <span>
                {step}
              </span>
            </li>
          ),
        )}
      </ol>


      {action && (
        <Link
          href={
            action.route
          }
          className={
            styles.systemHelpAction
          }
        >
          <span>
            {action.label}
          </span>

          <ArrowIcon />
        </Link>
      )}
    </div>
  );
}


// =========================================================
// MATCH BADGE
// =========================================================

function MatchBadge({
  type,
}: {
  type:
    AiMatchType;
}) {

  if (
    type ===
    'EXACT_MATCH'
  ) {

    return (
      <div
        className={`${styles.matchBadge} ${styles.exactMatch}`}
      >
        <CheckIcon />

        Khớp chính xác
      </div>
    );
  }


  if (
    type ===
    'NEAR_MATCH'
  ) {

    return (
      <div
        className={`${styles.matchBadge} ${styles.nearMatch}`}
      >
        <SparkleIcon />

        Gợi ý gần nhất
      </div>
    );
  }


  return (
    <div
      className={`${styles.matchBadge} ${styles.noMatch}`}
    >
      <InfoIcon />

      Chưa có kết quả phù hợp
    </div>
  );
}


// =========================================================
// FILTERS
// =========================================================

function FilterSummary({
  filters,
}: {
  filters:
    AiFilters;
}) {

  const items:
    string[] =
    [];


  if (
    filters.desiredTransaction
  ) {

    items.push(
      filters.desiredTransaction ===
        'SALE'

        ? 'Mua'

        : 'Thuê',
    );
  }


  if (
    filters.district
  ) {

    items.push(
      filters.district,
    );

  } else if (
    filters.city
  ) {

    items.push(
      filters.city,
    );
  }


  if (
    filters.maxPrice !==
    undefined
  ) {

    items.push(
      `≤ ${formatMoney(
        filters.maxPrice,
      )}`,
    );
  }


  if (
    filters.minArea !==
    undefined
  ) {

    items.push(
      `≥ ${filters.minArea} m²`,
    );
  }


  if (
    filters.bedrooms !==
    undefined
  ) {

    items.push(
      `${filters.bedrooms}+ PN`,
    );
  }


  if (
    items.length ===
    0
  ) {

    return null;
  }


  return (
    <div
      className={
        styles.filterChips
      }
    >
      {items.map(
        (
          item,
        ) => (

          <span
            key={
              item
            }
            className={
              styles.filterChip
            }
          >
            {item}
          </span>
        ),
      )}
    </div>
  );
}


// =========================================================
// FINANCIAL
// =========================================================

function FinancialCard({
  guidance,
}: {
  guidance:
    AiFinancialGuidance;
}) {

  return (
    <div
      className={
        styles.financialCard
      }
    >
      <div
        className={
          styles.financialTitle
        }
      >
        Gợi ý ngân sách
      </div>


      <div
        className={
          styles.financialNumbers
        }
      >
        <div>
          <span>
            Mức đề xuất
          </span>

          <strong>
            {formatMoney(
              guidance
                .suggestedHousingBudget,
            )}
          </strong>
        </div>


        <div>
          <span>
            Ngưỡng tham khảo
          </span>

          <strong>
            {formatMoney(
              guidance
                .upperHousingBudget,
            )}
          </strong>
        </div>
      </div>


      <p>
        {guidance.note}
      </p>
    </div>
  );
}


// =========================================================
// PROPERTY CARD
// =========================================================

function PropertyCard({
  property,
}: {
  property:
    AiPropertySuggestion;
}) {

  const image =
    property.thumbnail ||
    property.images?.[0] ||
    null;


  const location =
    [
      property.ward,
      property.district,
      property.city,
    ]
      .filter(
        Boolean,
      )
      .join(', ');


  return (
    <Link
      href={`/posts/${property.id}`}
      className={
        styles.propertyCardLink
      }
      aria-label={`Xem chi tiết ${property.title}`}
    >
      <article
        className={
          styles.propertyCard
        }
      >
        <div
          className={
            styles.propertyImageWrapper
          }
        >
          {image ? (
            <img
              src={
                image
              }
              alt={
                property.title
              }
              className={
                styles.propertyImage
              }
              loading="lazy"
            />
          ) : (
            <div
              className={
                styles.propertyImageFallback
              }
            >
              <HomeIcon />
            </div>
          )}


          <div
            className={
              styles.scoreBadge
            }
          >
            {property.score}% phù hợp
          </div>


          <div
            className={
              styles.propertyOverlay
            }
          >
            <span>
              Xem chi tiết
            </span>

            <ArrowIcon />
          </div>
        </div>


        <div
          className={
            styles.propertyBody
          }
        >
          <h4
            className={
              styles.propertyTitle
            }
            title={
              property.title
            }
          >
            {property.title}
          </h4>


          <div
            className={
              styles.propertyPrice
            }
          >
            {formatMoney(
              property.price,
            )}
          </div>


          <div
            className={
              styles.propertyMeta
            }
          >
            <span>
              {property.area} m²
            </span>


            {property.bedrooms !==
              null && (
              <span>
                {property.bedrooms} PN
              </span>
            )}


            {property.bathrooms !==
              null && (
              <span>
                {property.bathrooms} WC
              </span>
            )}
          </div>


          {location && (
            <div
              className={
                styles.propertyLocation
              }
            >
              <LocationIcon />

              <span>
                {location}
              </span>
            </div>
          )}


          {property.sellerName && (
            <div
              className={
                styles.seller
              }
            >
              Người đăng: {property.sellerName}
            </div>
          )}


          <div
            className={
              styles.viewDetail
            }
          >
            <span>
              Xem chi tiết bất động sản
            </span>

            <ArrowIcon />
          </div>
        </div>
      </article>
    </Link>
  );
}


// =========================================================
// MONEY FORMAT
// =========================================================

function formatMoney(
  value:
    number,
): string {

  if (
    value >=
    1_000_000_000
  ) {

    const billions =
      value /
      1_000_000_000;


    return `${billions.toLocaleString(
      'vi-VN',
      {
        maximumFractionDigits:
          2,
      },
    )} tỷ`;
  }


  if (
    value >=
    1_000_000
  ) {

    const millions =
      value /
      1_000_000;


    return `${millions.toLocaleString(
      'vi-VN',
      {
        maximumFractionDigits:
          1,
      },
    )} triệu`;
  }


  return new Intl
    .NumberFormat(
      'vi-VN',
      {
        style:
          'currency',

        currency:
          'VND',

        maximumFractionDigits:
          0,
      },
    )
    .format(
      value,
    );
}


// =========================================================
// ICONS
// =========================================================

function BotIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <path
        d="M12 3V5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <rect
        x="4"
        y="6"
        width="16"
        height="13"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M8 11H8.01M16 11H16.01"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <path
        d="M9 15C10.8 16.2 13.2 16.2 15 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}


function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 4L21 12L4 20L7 12L4 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="M7 12H21"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}


function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}


function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 11A8 8 0 1 0 18 16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M20 6V11H15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3C12.6 7 14 8.4 18 9C14 9.6 12.6 11 12 15C11.4 11 10 9.6 6 9C10 8.4 11.4 7 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      <path
        d="M18.5 14C18.8 16 19.5 16.7 21.5 17C19.5 17.3 18.8 18 18.5 20C18.2 18 17.5 17.3 15.5 17C17.5 16.7 18.2 16 18.5 14Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12.5L9.5 17L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M12 11V16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <circle
        cx="12"
        cy="8"
        r="1"
        fill="currentColor"
      />
    </svg>
  );
}


function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 11L12 4L21 11"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M5 10V20H19V10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M9 20V14H15V20"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}


function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 21C16 16.5 18 13.4 18 10A6 6 0 1 0 6 10C6 13.4 8 16.5 12 21Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <circle
        cx="12"
        cy="10"
        r="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}


function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M13 6L19 12L13 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function HelpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M9.8 9A2.3 2.3 0 0 1 12.2 7C13.8 7 15 8 15 9.5C15 11.4 12 11.5 12 14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <circle
        cx="12"
        cy="17"
        r="1"
        fill="currentColor"
      />
    </svg>
  );
}