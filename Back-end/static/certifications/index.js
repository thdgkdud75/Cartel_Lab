(function () {
    var app = document.querySelector("[data-certifications-app]");
    if (!app) return;

    var detailPanel = document.getElementById("certDetailPanel");
    var selectorList = document.getElementById("certSelectorList");
    var pinnedList = document.getElementById("certPinnedList");
    var pinnedBrowser = document.getElementById("certPinnedBrowser");
    var pinnedToggle = document.getElementById("certPinnedToggle");
    var pinnedToggleLabel = pinnedToggle ? pinnedToggle.querySelector("[data-cert-accordion-label]") : null;
    var statsPanel = document.getElementById("certStats");
    var certModal = document.getElementById("certModal");
    var certModalExternalLink = document.getElementById("certModalExternalLink");
    var searchInput = document.getElementById("certSearchInput");
    var filterButtons = document.querySelectorAll(".cert-filter-btn");
    var categoryButtons = document.querySelectorAll(".cert-category-btn");
    var liveAlert = document.getElementById("certLiveAlert");
    var liveAlertList = document.getElementById("certLiveAlertList");
    var apiUrl = app.dataset.certificationsApiUrl || "/certifications/api/important/";
    var plannerGoalUrl = app.dataset.certificationsPlannerGoalUrl || "";
    var selectedStorageKey = "certifications-selected-slug";
    var favoritesStorageKey = "certifications-favorites-v1";
    var knownSchedulesStorageKey = "certifications-known-schedules-v1";
    var calendarModal = document.getElementById("certCalendarModal");
    var calendarSelect = document.getElementById("certCalendarSelect");
    var calendarCopy = document.getElementById("certCalendarCopy");
    var calendarFeedback = document.getElementById("certCalendarFeedback");
    var calendarSubmitButton = document.getElementById("certCalendarSubmit");
    var currentFilter = "all";
    var currentCategory = "all";
    var allItems = [];
    var selectedSlug = "";
    var selectedCalendarSlug = "";
    var hiddenSlugs = ["sqlp"];
    var pinnedSlugs = [
        "information-processing-industrial",
        "information-processing-industrial-engineer",
        "sqld"
    ];
    var categoryMeta = {
        development: { label: "\uac1c\ubc1c" },
        db: { label: "DB" },
        design: { label: "\ub514\uc790\uc778" },
        security: { label: "\ubcf4\uc548" }
    };
    var HANGUL_SYLLABLE_BASE = 44032;
    var HANGUL_SYLLABLE_END = 55203;
    var CHOSEONG_LIST = [
        "\u3131", "\u3132", "\u3134", "\u3137", "\u3138",
        "\u3139", "\u3141", "\u3142", "\u3143", "\u3145",
        "\u3146", "\u3147", "\u3148", "\u3149", "\u314a",
        "\u314b", "\u314c", "\u314d", "\u314e"
    ];
    var SEARCH_ALIASES_BY_SLUG = {
        "information-processing-industrial": [
            "정보 처리 산업 기사",
            "정보 처리 산업기사",
            "정처산기"
        ],
        "bigdata-analysis-engineer": [
            "빅 데이터 분석 기사",
            "빅데이터 분석 기사",
            "빅분기"
        ],
        "bigdata-dataq": [
            "빅 데이터 분석 기사",
            "빅데이터 분석 기사",
            "빅분기"
        ],
        "adp": [
            "데이터 분석 전문가",
            "데이터분석전문가",
            "데분전"
        ],
        "adsp": [
            "데이터 분석 준전문가",
            "데이터분석준전문가",
            "데분준"
        ],
        "sqld": [
            "sql 개발자",
            "sql 개발 자격"
        ],
        "sqlp": [
            "sql 전문가",
            "sql 전문 자격"
        ],
        "dap": [
            "데이터 아키텍처 전문가",
            "데이터아키텍처전문가",
            "데아전"
        ],
        "dasp": [
            "데이터 아키텍처 준전문가",
            "데이터아키텍처준전문가",
            "데아준"
        ],
        "ai-literacy": [
            "ai 활용 능력",
            "인공지능 활용 능력"
        ],
        "prompt-engineer": [
            "프롬프트 엔지니어",
            "ai 프롬프트",
            "프롬프트 자격증"
        ],
        "linux-master": [
            "리눅스 마스터",
            "리눅마"
        ],
        "information-security-engineer": [
            "정보 보안 기사",
            "정보보안 기사"
        ],
        "web-design-craftsman": [
            "웹 디자인 기능사",
            "웹디자인 기능사"
        ],
        "computer-specialist": [
            "컴퓨터 활용 능력",
            "컴퓨터활용능력",
            "컴활"
        ],
        "digital-forensics": [
            "디지털 포렌식 전문가",
            "디지털포렌식전문가",
            "디포전"
        ],
        "ai-pot": [
            "ai pot",
            "aipot",
            "ai 프롬프트 활용 능력",
            "ai프롬프트활용능력"
        ],
        "aibt": [
            "ai 비즈니스 활용 능력",
            "ai비즈니스활용능력"
        ],
        "gtq-ai": [
            "gtq ai",
            "gtqai"
        ],
        "sw-coding": [
            "sw 코딩 자격",
            "sw코딩 자격"
        ],
        "dsac": [
            "데이터 사이언티스트 능력 인증 자격",
            "데이터사이언티스트능력인증자격"
        ],
        "deq": [
            "데이터 윤리 자격",
            "데이터윤리자격"
        ],
        "itq": [
            "정보 기술 자격",
            "정보기술자격"
        ]
    };
    var DISTINCTION_NOTES_BY_SLUG = {
        "sqld": {
            short: "SQLP와 다른 시험 · SQL 기본과 개발 실무 기초 중심",
            detail: "SQLP와 다른 시험입니다. SQLD는 SQL 기본 문법과 개발 실무 기초를 확인하는 입문 성격의 시험입니다."
        },
        "sqlp": {
            short: "SQLD와 다른 시험 · 설계와 성능 튜닝까지 보는 상위 단계",
            detail: "SQLD와 다른 시험입니다. SQLP는 SQL 설계, 데이터 모델 이해, 성능 튜닝까지 보는 상위 전문가 시험입니다."
        },
        "adsp": {
            short: "ADP와 다른 시험 · 데이터 분석 입문과 기초 실무 중심",
            detail: "ADP와 다른 시험입니다. ADsP는 데이터 분석 기본 개념, 통계 기초, 분석 실무 이해를 보는 준전문가 단계 시험입니다."
        },
        "adp": {
            short: "ADsP와 다른 시험 · 분석 설계와 실무 역량을 더 깊게 확인",
            detail: "ADsP와 다른 시험입니다. ADP는 데이터 분석 설계, 통계 적용, 모델링과 해석까지 더 깊게 보는 전문가 단계 시험입니다."
        },
        "dasp": {
            short: "DAP와 다른 시험 · 데이터 아키텍처 기초와 모델링 기본 중심",
            detail: "DAP와 다른 시험입니다. DAsP는 데이터 아키텍처 기본 개념, 표준화, 모델링 기초를 확인하는 준전문가 단계 시험입니다."
        },
        "dap": {
            short: "DAsP와 다른 시험 · 설계와 거버넌스까지 보는 상위 단계",
            detail: "DAsP와 다른 시험입니다. DAP는 데이터 구조 설계, 품질 관리, 거버넌스까지 더 넓게 다루는 전문가 단계 시험입니다."
        },
        "information-processing-industrial": {
            short: "정보처리기사와 다른 시험 · 산업기사 단계의 실무형 자격",
            detail: "정보처리기사와 다른 시험입니다. 정보처리산업기사는 산업기사 단계 자격으로, 기사 대비 범위와 난이도, 응시 기준이 다를 수 있습니다."
        },
        "information-processing-industrial-engineer": {
            short: "정보처리산업기사와 다른 시험 · 기사 단계의 상위 자격",
            detail: "정보처리산업기사와 다른 시험입니다. 정보처리기사는 기사 단계 자격으로, 산업기사 대비 이론 범위와 난이도가 더 높은 편입니다."
        }
    };

    if (!detailPanel || !selectorList || !pinnedList || !searchInput || !liveAlert || !liveAlertList || !certModal || !calendarModal || !calendarSelect || !calendarCopy || !calendarFeedback || !calendarSubmitButton) {
        return;
    }

    function readFavorites() {
        try {
            var stored = JSON.parse(localStorage.getItem(favoritesStorageKey) || "[]");
            return Array.isArray(stored) ? stored : [];
        } catch (error) {
            return [];
        }
    }

    function writeFavorites(values) {
        try {
            localStorage.setItem(favoritesStorageKey, JSON.stringify(values));
        } catch (error) {}

        window.dispatchEvent(new CustomEvent("certifications:favorites-updated", {
            detail: { favorites: values.slice() }
        }));
    }

    function readSelectedSlug() {
        try {
            return localStorage.getItem(selectedStorageKey) || "";
        } catch (error) {
            return "";
        }
    }

    function writeSelectedSlug(value) {
        try {
            if (!value) {
                localStorage.removeItem(selectedStorageKey);
                return;
            }
            localStorage.setItem(selectedStorageKey, value);
        } catch (error) {}
    }

    function readKnownScheduleMap() {
        try {
            return JSON.parse(localStorage.getItem(knownSchedulesStorageKey) || "{}");
        } catch (error) {
            return {};
        }
    }

    function writeKnownScheduleMap(value) {
        try {
            localStorage.setItem(knownSchedulesStorageKey, JSON.stringify(value));
        } catch (error) {}
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getCsrfToken() {
        var name = "csrftoken=";
        var cookies = document.cookie ? document.cookie.split(";") : [];
        for (var index = 0; index < cookies.length; index += 1) {
            var cookie = cookies[index].trim();
            if (cookie.indexOf(name) === 0) {
                return decodeURIComponent(cookie.substring(name.length));
            }
        }
        return "";
    }

    function findItemBySlug(slug) {
        return allItems.find(function (item) {
            return item.slug === slug;
        }) || null;
    }

    function setPinnedBrowserExpanded(isExpanded) {
        if (!pinnedBrowser || !pinnedToggle) return;

        pinnedBrowser.classList.toggle("is-expanded", !!isExpanded);
        pinnedBrowser.classList.toggle("is-collapsed", !isExpanded);
        pinnedToggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");

        if (pinnedToggleLabel) {
            pinnedToggleLabel.textContent = isExpanded ? "접기" : "열기";
        }
    }

    function togglePinnedBrowser() {
        if (!pinnedBrowser) return;
        setPinnedBrowserExpanded(pinnedBrowser.classList.contains("is-collapsed"));
    }

    function extractDateValue(rawValue) {
        if (!rawValue) return "";
        var normalized = String(rawValue).replace(/\s+/g, " ");
        var match = normalized.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
        if (!match) return "";

        var year = match[1];
        var month = String(match[2]).padStart(2, "0");
        var day = String(match[3]).padStart(2, "0");
        return [year, month, day].join("-");
    }

    function getTodayIsoDate() {
        var today = new Date();
        var year = String(today.getFullYear());
        var month = String(today.getMonth() + 1).padStart(2, "0");
        var day = String(today.getDate()).padStart(2, "0");
        return [year, month, day].join("-");
    }

    function getCalendarCandidates(item) {
        var candidates = [];
        var seen = {};
        var todayIso = getTodayIsoDate();
        var fieldMeta = [
            { key: "registration", label: "\uc811\uc218", priority: 0 },
            { key: "written_registration", label: "\ud544\uae30 \uc811\uc218", priority: 1 },
            { key: "practical_registration", label: "\uc2e4\uae30 \uc811\uc218", priority: 2 },
            { key: "exam_date", label: "\uc2dc\ud5d8", priority: 10 },
            { key: "written_exam", label: "\ud544\uae30 \uc2dc\ud5d8", priority: 11 },
            { key: "practical_exam", label: "\uc2e4\uae30 \uc2dc\ud5d8", priority: 12 }
        ];

        (item.schedules || []).forEach(function (schedule, scheduleIndex) {
            fieldMeta.forEach(function (field) {
                var rawValue = schedule[field.key];
                var isoDate = extractDateValue(rawValue);
                if (!isoDate) return;
                if (isoDate < todayIso) return;

                var roundLabel = schedule.round || "\uc77c\uc815 " + String(scheduleIndex + 1);
                var label = roundLabel + " " + field.label;
                var dedupeKey = [isoDate, label].join("|");
                if (seen[dedupeKey]) return;
                seen[dedupeKey] = true;

                candidates.push({
                    date: isoDate,
                    label: label,
                    display: rawValue,
                    priority: field.priority
                });
            });
        });

        return candidates.sort(function (left, right) {
            if (left.date !== right.date) return left.date.localeCompare(right.date);
            return left.priority - right.priority;
        });
    }

    function renderCalendarAction(item) {
        if (!getCalendarCandidates(item).length) return "";

        return '' +
            '<button type="button" class="cert-calendar-trigger" data-cert-calendar="' + escapeHtml(item.slug) + '">' +
                '캘린더 추가' +
            '</button>';
    }

    function normalizeItem(item) {
        if (!item) return item;
        var normalized = Object.assign({}, item);
        var infoProcessingAliases = [
            "information-processing-engineer",
            "industrial-information-processing"
        ];
        var infoProcessingNames = [
            "정보처리기능사",
            "정보처리기사",
            "정보처리산업기사"
        ];
        if (
            infoProcessingAliases.indexOf(normalized.slug) !== -1 ||
            infoProcessingNames.indexOf(normalized.name) !== -1 ||
            infoProcessingNames.indexOf(normalized.short_name) !== -1
        ) {
            normalized.slug = "information-processing-industrial";
            normalized.name = "정보처리산업기사";
            normalized.short_name = "정보처리산업기사";
        }
        return normalized;
    }

    function normalizeItems(items) {
        var seen = {};
        var grouped = {};
        var ordered = [];

        function sourceRank(source) {
            if (source === "Q-Net") return 0;
            if (source === "KDATA DataQ") return 1;
            if (source === "KAIT") return 2;
            if (source === "한국생산성본부") return 3;
            return 9;
        }

        function scheduleFingerprint(schedule) {
            return [
                schedule && schedule.round,
                schedule && schedule.registration,
                schedule && schedule.exam_date,
                schedule && schedule.written_registration,
                schedule && schedule.written_exam,
                schedule && schedule.practical_registration,
                schedule && schedule.practical_exam,
                schedule && schedule.result_date,
                schedule && schedule.written_result,
                schedule && schedule.final_result
            ].join("|");
        }

        function sourceEntryKey(entry) {
            return [
                entry.source,
                entry.official_url,
                entry.apply_url,
                entry.apply_label
            ].join("|");
        }

        function getSourceEntry(item) {
            return {
                source: item.source || "",
                qualifier: getSourceQualifier(item),
                official_url: item.official_url || "",
                apply_url: item.apply_url || "",
                apply_label: item.apply_label || ""
            };
        }

        (items || []).map(normalizeItem).filter(function (item) {
            if (!item || hiddenSlugs.indexOf(item.slug) !== -1) return false;
            var key = [item.slug, item.name, item.source].join("|");
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        }).forEach(function (item) {
            var mergeKey = item.name || item.short_name || item.slug;
            var sourceEntry = getSourceEntry(item);
            var existing = grouped[mergeKey];

            if (!existing) {
                grouped[mergeKey] = Object.assign({}, item, {
                    source_entries: [sourceEntry],
                    merged_slugs: [item.slug]
                });
                ordered.push(mergeKey);
                return;
            }

            existing.merged_slugs = existing.merged_slugs.concat(item.slug);

            var sourceEntryExists = existing.source_entries.some(function (entry) {
                return sourceEntryKey(entry) === sourceEntryKey(sourceEntry);
            });
            if (!sourceEntryExists) {
                existing.source_entries.push(sourceEntry);
                existing.source_entries.sort(function (left, right) {
                    return sourceRank(left.source) - sourceRank(right.source);
                });
            }

            var mergedSchedules = (existing.schedules || []).concat(item.schedules || []);
            var scheduleSeen = {};
            existing.schedules = mergedSchedules.filter(function (schedule) {
                var fingerprint = scheduleFingerprint(schedule);
                if (scheduleSeen[fingerprint]) return false;
                scheduleSeen[fingerprint] = true;
                return true;
            });

            if (sourceRank(item.source) < sourceRank(existing.source)) {
                existing.slug = item.slug;
                existing.official_url = item.official_url;
                existing.apply_url = item.apply_url;
                existing.apply_label = item.apply_label;
                existing.source = item.source;
            }

            if (!existing.description && item.description) existing.description = item.description;
            if ((!existing.error || existing.schedules.length) && item.error && !item.schedules.length) {
                existing.error = item.error;
            }
        });

        return ordered.map(function (key) {
            var item = grouped[key];
            var qualifiers = (item.source_entries || []).map(function (entry) {
                return entry.qualifier || entry.source;
            }).filter(Boolean);

            item.source = qualifiers.join(" · ") || item.source;
            return item;
        });
    }

    function normalizeSearchText(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
    }

    function compactSearchText(value) {
        return normalizeSearchText(value).replace(/[\s\-_/()[\]{}.,:+]+/g, "");
    }

    function extractChoseong(value) {
        var normalized = normalizeSearchText(value);
        var result = "";

        for (var index = 0; index < normalized.length; index += 1) {
            var char = normalized.charAt(index);
            var code = char.charCodeAt(0);

            if (code >= HANGUL_SYLLABLE_BASE && code <= HANGUL_SYLLABLE_END) {
                result += CHOSEONG_LIST[Math.floor((code - HANGUL_SYLLABLE_BASE) / 588)];
                continue;
            }

            if (/[ㄱ-ㅎa-z0-9]/.test(char)) {
                result += char;
            }
        }

        return result;
    }

    function getSearchAliases(item) {
        if (!item) return [];
        return SEARCH_ALIASES_BY_SLUG[item.slug] || [];
    }

    function buildSearchIndex(item) {
        var text = [
            item && item.name,
            item && item.short_name,
            item && item.source,
            item && item.description
        ].concat(getSearchAliases(item)).join(" ");

        return {
            normalized: normalizeSearchText(text),
            compact: compactSearchText(text),
            choseong: extractChoseong(text)
        };
    }

    function getBaseDisplayName(item) {
        if (!item) return "";
        return item.name || item.short_name || "";
    }

    function getSourceQualifier(item) {
        var source = item && item.source ? item.source : "";
        if (source === "KDATA DataQ") return "DataQ";
        if (source === "한국생산성본부") return "KPC";
        return source;
    }

    function displayName(item) {
        if (!item) return "";
        return getBaseDisplayName(item);
    }

    function displayShortName(item) {
        if (!item) return "";
        return displayName(item);
    }

    function getSourceEntries(item) {
        if (!item) return [];
        if (item.source_entries && item.source_entries.length) return item.source_entries;

        return [{
            source: item.source || "",
            qualifier: getSourceQualifier(item),
            official_url: item.official_url || "",
            apply_url: item.apply_url || "",
            apply_label: item.apply_label || ""
        }];
    }

    function getDistinctionInfo(item) {
        if (!item) return null;

        var slugs = [item.slug].concat(item.merged_slugs || []);
        for (var index = 0; index < slugs.length; index += 1) {
            var slug = slugs[index];
            if (slug && DISTINCTION_NOTES_BY_SLUG[slug]) {
                return DISTINCTION_NOTES_BY_SLUG[slug];
            }
        }

        return null;
    }

    function favoritesSet() {
        return new Set(readFavorites());
    }

    function isPinnedItem(item) {
        return !!item && pinnedSlugs.indexOf(item.slug) !== -1;
    }

    function getCategoryKey(item) {
        var slug = item && item.slug ? item.slug : "";

        if ([
            "information-processing-industrial",
            "information-processing-industrial-engineer",
            "ai-literacy",
            "prompt-engineer",
            "linux-master",
            "ai-pot",
            "aibt",
            "sw-coding",
            "itq"
        ].indexOf(slug) !== -1) return "development";

        if ([
            "sqld",
            "sqlp",
            "adsp",
            "adp",
            "dap",
            "dasp",
            "bigdata-analysis-engineer",
            "bigdata-dataq",
            "dsac"
        ].indexOf(slug) !== -1) return "db";

        if ([
            "web-design-craftsman",
            "gtq-ai",
            "computer-specialist"
        ].indexOf(slug) !== -1) return "design";

        if ([
            "information-security-engineer",
            "digital-forensics",
            "deq"
        ].indexOf(slug) !== -1) return "security";

        return "development";
    }

    function hasOpenRegistration(item) {
        return (item.schedules || []).some(function (schedule) {
            return [
                schedule.registration_status,
                schedule.written_registration_status,
                schedule.practical_registration_status
            ].some(function (status) {
                return status && status.code === "open";
            });
        });
    }

    function getStatusLabel(status) {
        if (!status || !status.code) return "상태 확인 필요";
        if (status.code === "today") return "D-DAY";
        if ((status.code === "urgent" || status.code === "soon" || status.code === "upcoming") && typeof status.days_left === "number") {
            return "D-" + String(status.days_left);
        }
        if (status.code === "open") return "접수 진행 중";
        if (status.code === "closed") return "접수 마감";
        if (status.code === "passed") return "시험 종료";
        if (status.code === "unknown") return "상태 확인 필요";
        return status.label || "상태 확인 필요";
    }

    function getExamStatuses(item) {
        var statuses = [];
        (item.schedules || []).forEach(function (schedule) {
            [schedule.exam_status, schedule.written_exam_status, schedule.practical_exam_status].forEach(function (status) {
                if (status && status.code) {
                    statuses.push(Object.assign({}, status, { label: getStatusLabel(status) }));
                }
            });
        });
        return statuses;
    }

    function getUrgency(item) {
        var priority = { today: 4, urgent: 3, soon: 2, upcoming: 1, passed: 0, unknown: 0 };
        var best = { code: "unknown", label: "일정 확인 필요" };

        getExamStatuses(item).forEach(function (status) {
            if ((priority[status.code] || 0) > (priority[best.code] || 0)) {
                best = status;
            }
        });

        return best;
    }

    function getNearestExamDays(item) {
        var nearest = null;

        getExamStatuses(item).forEach(function (status) {
            if (!status || typeof status.days_left !== "number") return;
            if (nearest === null || status.days_left < nearest) {
                nearest = status.days_left;
            }
        });

        return nearest;
    }

    function sortByUpcomingExam(items) {
        var urgencyPriority = {
            today: 0,
            urgent: 1,
            soon: 2,
            upcoming: 3,
            open: 4,
            closed: 5,
            passed: 6,
            unknown: 7
        };

        return (items || []).slice().sort(function (left, right) {
            var leftUrgency = getUrgency(left);
            var rightUrgency = getUrgency(right);
            var leftPriority = urgencyPriority[leftUrgency.code] !== undefined ? urgencyPriority[leftUrgency.code] : 99;
            var rightPriority = urgencyPriority[rightUrgency.code] !== undefined ? urgencyPriority[rightUrgency.code] : 99;

            if (leftPriority !== rightPriority) {
                return leftPriority - rightPriority;
            }

            var leftDays = getNearestExamDays(left);
            var rightDays = getNearestExamDays(right);

            if (leftDays === null && rightDays !== null) return 1;
            if (leftDays !== null && rightDays === null) return -1;
            if (leftDays !== null && rightDays !== null && leftDays !== rightDays) {
                return leftDays - rightDays;
            }

            return displayShortName(left).localeCompare(displayShortName(right), "ko");
        });
    }

    function getSummaryText(item) {
        if (item.error) return "공식 일정 확인 필요";
        if (!(item.schedules || []).length) return "공식 사이트에서 일정 확인";
        if (hasOpenRegistration(item)) return "접수 진행 중";

        var urgency = getUrgency(item);
        if (urgency.code === "today") return "오늘 시험";
        if (urgency.code === "urgent" || urgency.code === "soon") return "시험 임박";
        return "일정 확인 가능";
    }

    function getStatusClass(code) {
        if (code === "today") return "status-today";
        if (code === "urgent") return "status-urgent";
        if (code === "soon") return "status-soon";
        if (code === "open") return "status-open";
        if (code === "closed") return "status-closed";
        return "";
    }

    function buildScheduleFingerprint(item) {
        return (item.schedules || []).map(function (schedule) {
            return [
                schedule.round,
                schedule.registration,
                schedule.exam_date,
                schedule.written_registration,
                schedule.written_exam,
                schedule.practical_registration,
                schedule.practical_exam
            ].join("|");
        }).join("||");
    }

    function getPrimaryScheduleEntry(item) {
        var todayIso = getTodayIsoDate();
        var registrationFields = [
            { key: "registration", label: "접수", priority: 0 },
            { key: "written_registration", label: "필기 접수", priority: 1 },
            { key: "practical_registration", label: "실기 접수", priority: 2 }
        ];
        var examFields = [
            { key: "exam_date", label: "시험", priority: 10 },
            { key: "written_exam", label: "필기 시험", priority: 11 },
            { key: "practical_exam", label: "실기 시험", priority: 12 }
        ];
        var futureRegistrationEntries = [];
        var futureExamEntries = [];
        var fallbackRegistrationEntry = null;
        var fallbackExamEntry = null;

        function updateFallback(currentEntry, nextEntry) {
            if (!currentEntry) return nextEntry;
            if (nextEntry.date < currentEntry.date) return nextEntry;
            if (nextEntry.date === currentEntry.date && nextEntry.priority < currentEntry.priority) return nextEntry;
            return currentEntry;
        }

        function collectEntries(schedule, fields, futureEntries, fallbackType) {
            fields.forEach(function (field) {
                var rawValue = schedule[field.key];
                var isoDate = extractDateValue(rawValue);
                if (!rawValue || !isoDate) return;

                var entry = {
                    date: isoDate,
                    rawValue: rawValue,
                    label: field.label,
                    priority: field.priority
                };

                if (isoDate >= todayIso) {
                    futureEntries.push(entry);
                }

                if (fallbackType === "registration") {
                    fallbackRegistrationEntry = updateFallback(fallbackRegistrationEntry, entry);
                    return;
                }

                fallbackExamEntry = updateFallback(fallbackExamEntry, entry);
            });
        }

        (item && item.schedules || []).forEach(function (schedule) {
            collectEntries(schedule, registrationFields, futureRegistrationEntries, "registration");
            collectEntries(schedule, examFields, futureExamEntries, "exam");
        });

        function pickEarliest(entries) {
            return entries.sort(function (left, right) {
                if (left.date !== right.date) return left.date.localeCompare(right.date);
                return left.priority - right.priority;
            })[0];
        }

        if (futureRegistrationEntries.length) {
            return pickEarliest(futureRegistrationEntries);
        }

        if (futureExamEntries.length) {
            return pickEarliest(futureExamEntries);
        }

        return fallbackRegistrationEntry || fallbackExamEntry;
    }

    function formatPrimarySchedule(item) {
        var primaryEntry = getPrimaryScheduleEntry(item);
        if (primaryEntry) {
            return primaryEntry.label + " " + primaryEntry.rawValue;
        }
        return "공식 일정 확인 필요";
    }

    function renderDifficultyDots(score) {
        var safeScore = Math.max(0, Math.min(5, Number(score || 0)));
        var dots = [];
        for (var index = 0; index < 5; index += 1) {
            dots.push('<span class="cert-difficulty-dot' + (index < safeScore ? ' is-filled' : '') + '"></span>');
        }
        return '<span class="cert-difficulty-dots" aria-hidden="true">' + dots.join("") + "</span>";
    }

    function renderLiveAlerts(items, payload) {
        var alerts = [];
        var knownMap = readKnownScheduleMap();
        var nextKnownMap = {};

        (items || []).forEach(function (item) {
            var fingerprint = buildScheduleFingerprint(item);
            nextKnownMap[item.slug] = fingerprint;
            if (fingerprint && knownMap[item.slug] && knownMap[item.slug] !== fingerprint) {
                alerts.push(displayName(item) + " 일정이 새로 업데이트되었습니다.");
            }
        });

        if ((payload.today_alerts || []).length) {
            payload.today_alerts.forEach(function (alert) {
                alerts.push(alert.name + " " + alert.round + " " + alert.part + " 시험일입니다.");
            });
        }

        writeKnownScheduleMap(nextKnownMap);

        if (!alerts.length) {
            liveAlert.classList.remove("is-visible");
            liveAlertList.innerHTML = "";
            return;
        }

        liveAlertList.innerHTML = alerts.map(function (text) {
            return '<span class="cert-live-alert-item">' + escapeHtml(text) + "</span>";
        }).join("");
        liveAlert.classList.add("is-visible");
    }

    function renderStats(items) {
        if (!statsPanel) return;

        var openCount = items.filter(hasOpenRegistration).length;
        var urgentCount = items.filter(function (item) {
            var code = getUrgency(item).code;
            return code === "today" || code === "urgent" || code === "soon";
        }).length;
        var nearest = items
            .map(function (item) { return { item: item, urgency: getUrgency(item) }; })
            .find(function (entry) {
                return ["today", "urgent", "soon", "upcoming"].indexOf(entry.urgency.code) !== -1;
            });

        statsPanel.innerHTML = [
            {
                label: "전체 자격증",
                value: String(items.length),
                copy: "검색과 빠른 선택으로 원하는 종목만 바로 볼 수 있습니다."
            },
            {
                label: "접수 진행 중",
                value: String(openCount),
                copy: "지금 바로 신청 가능한 자격증 수입니다."
            },
            {
                label: "시험 임박",
                value: String(urgentCount),
                copy: "D-30 안으로 들어온 자격증을 모아봤습니다."
            },
            {
                label: "가장 가까운 시험",
                value: nearest ? escapeHtml(displayShortName(nearest.item)) : "-",
                copy: nearest ? escapeHtml(nearest.urgency.label || "일정 확인 가능") : "임박한 시험이 없으면 차분한 기본 상태로 보입니다."
            }
        ].map(function (stat) {
            return '' +
                '<div class="cert-stat">' +
                    '<p class="cert-stat-label">' + stat.label + '</p>' +
                    '<p class="cert-stat-value">' + stat.value + '</p>' +
                    '<p class="cert-stat-copy">' + stat.copy + '</p>' +
                '</div>';
        }).join("");
    }

    function scheduleRows(schedule) {
        var rows = [];

        function addRow(label, value, status) {
            if (!value) return;
            var chip = status && status.code
                ? '<span class="cert-chip ' + getStatusClass(status.code) + '">' + escapeHtml(getStatusLabel(status)) + '</span>'
                : "";
            rows.push(
                '<div class="cert-schedule-row">' +
                    '<p class="cert-schedule-label">' + escapeHtml(label) + '</p>' +
                    '<div class="cert-glance-value">' + escapeHtml(value) + ' ' + chip + '</div>' +
                '</div>'
            );
        }

        addRow("접수", schedule.registration, schedule.registration_status);
        addRow("필기 접수", schedule.written_registration, schedule.written_registration_status);
        addRow("실기 접수", schedule.practical_registration, schedule.practical_registration_status);
        addRow("시험일", schedule.exam_date, schedule.exam_status);
        addRow("필기 시험", schedule.written_exam, schedule.written_exam_status);
        addRow("실기 시험", schedule.practical_exam, schedule.practical_exam_status);
        addRow("수험표", schedule.ticket_open);
        addRow("필기 수험표", schedule.written_ticket_open);
        addRow("실기 수험표", schedule.practical_ticket_open);
        addRow("가답안/검토", schedule.score_review);
        addRow("필기 가답안", schedule.written_score_review);
        addRow("실기 가답안", schedule.practical_score_review);
        addRow("합격 발표", schedule.result_date);
        addRow("필기 합격 발표", schedule.written_result);
        addRow("최종 합격 발표", schedule.final_result);

        return rows.join("");
    }

    function renderDetail(item) {
        if (!item) {
            detailPanel.innerHTML = '<div class="cert-empty">조건에 맞는 자격증이 없습니다.</div>';
            if (certModalExternalLink) certModalExternalLink.setAttribute("href", "#");
            return;
        }

        var favoriteIds = readFavorites();
        var isFavorite = favoriteIds.indexOf(item.slug) !== -1;
        var urgency = getUrgency(item);
        var hasSchedules = (item.schedules || []).length > 0;
        var sourceEntries = getSourceEntries(item);
        var distinctionInfo = getDistinctionInfo(item);
        var cardClass = "";
        if (urgency.code === "today") cardClass = "urgency-today";
        if (urgency.code === "urgent") cardClass = "urgency-urgent";
        if (urgency.code === "soon") cardClass = "urgency-soon";

        var metaChips = [];
        metaChips.push('<span class="cert-chip">' + escapeHtml(item.source || "공식 사이트") + "</span>");
        metaChips.push('<span class="cert-chip ' + getStatusClass(urgency.code) + '">' + escapeHtml(getSummaryText(item)) + "</span>");
        if (urgency.label && urgency.code !== "unknown") {
            metaChips.push('<span class="cert-chip ' + getStatusClass(urgency.code) + '">' + escapeHtml(urgency.label) + "</span>");
        }

        var scheduleMarkup = hasSchedules
            ? '<div class="cert-schedule-list">' + item.schedules.map(function (schedule) {
                return '' +
                    '<article class="cert-schedule-item">' +
                        '<p class="cert-schedule-round">' +
                            escapeHtml(schedule.round || "일정") +
                            ((schedule.is_today || urgency.code === "today") ? '<span class="cert-chip status-today">D-DAY</span>' : '') +
                        '</p>' +
                        '<div class="cert-schedule-grid">' + scheduleRows(schedule) + '</div>' +
                    '</article>';
            }).join("") + '</div>'
            : '<div class="cert-empty-state">' +
                (item.error
                    ? escapeHtml(item.error)
                    : '아직 연동된 일정이 없어도 공식 사이트로 바로 이동할 수 있게 준비했습니다.') +
              '</div>';

        if (certModalExternalLink) {
            var primarySourceEntry = sourceEntries[0] || null;
            certModalExternalLink.setAttribute(
                "href",
                (primarySourceEntry && (primarySourceEntry.official_url || primarySourceEntry.apply_url)) || item.official_url || item.apply_url || "#"
            );
        }

        var sourceLinks = sourceEntries.map(function (entry) {
            var qualifier = entry.qualifier || entry.source || "공식";
            var links = [];

            if (entry.official_url) {
                links.push(
                    '<a class="cert-link" href="' + escapeHtml(entry.official_url) + '" target="_blank" rel="noopener noreferrer">' +
                        escapeHtml(qualifier + " 일정") +
                    '</a>'
                );
            }

            if (entry.apply_url && entry.apply_url !== entry.official_url) {
                links.push(
                    '<a class="cert-link secondary" href="' + escapeHtml(entry.apply_url) + '" target="_blank" rel="noopener noreferrer">' +
                        escapeHtml(qualifier + " 신청") +
                    '</a>'
                );
            }

            return links.join("");
        }).join("");

        detailPanel.innerHTML = '' +
            '<article class="cert-card ' + cardClass + '">' +
                '<div class="cert-card-head">' +
                    '<div>' +
                        '<h2 class="cert-card-name">' + escapeHtml(displayName(item)) + '</h2>' +
                        '<div class="cert-card-meta">' + metaChips.join("") + '</div>' +
                    '</div>' +
                    '<div class="cert-card-actions">' +
                        '<button type="button" class="cert-card-action ' + (isFavorite ? "is-active" : "") + '" data-favorite-toggle="' + escapeHtml(item.slug) + '">' +
                            (isFavorite ? "관심 해제" : "관심 등록") +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '<p class="cert-card-copy">' + escapeHtml(item.description || "공식 일정과 접수 링크를 빠르게 확인할 수 있습니다.") + '</p>' +
                (distinctionInfo
                    ? '<div class="cert-detail-distinction">' +
                        '<strong>비슷한 시험과 차이</strong>' +
                        '<span>' + escapeHtml(distinctionInfo.detail) + '</span>' +
                      '</div>'
                    : '') +
                '<div class="cert-glance">' +
                    '<div class="cert-glance-item">' +
                        '<p class="cert-glance-label">시험 구조</p>' +
                        '<p class="cert-glance-value">' + escapeHtml((item.exam_structure || []).join(", ") || "공식 사이트 기준") + '</p>' +
                    '</div>' +
                    '<div class="cert-glance-item">' +
                        '<p class="cert-glance-label">접수 상태</p>' +
                        '<p class="cert-glance-value">' + escapeHtml(hasOpenRegistration(item) ? "접수 진행 중" : "일정 확인") + '</p>' +
                    '</div>' +
                    '<div class="cert-glance-item">' +
                        '<p class="cert-glance-label">가장 가까운 일정</p>' +
                        '<p class="cert-glance-value">' + escapeHtml(formatPrimarySchedule(item)) + '</p>' +
                    '</div>' +
                    '<div class="cert-glance-item">' +
                        '<p class="cert-glance-label">합격률</p>' +
                        '<p class="cert-glance-value">' + escapeHtml(item.pass_rate || "공식 사이트 확인 필요") + '</p>' +
                    '</div>' +
                    '<div class="cert-glance-item">' +
                        '<p class="cert-glance-label">응시료</p>' +
                        '<p class="cert-glance-value">' + escapeHtml(item.exam_fee || "추가 확인 필요") + '</p>' +
                    '</div>' +
                    '<div class="cert-glance-item">' +
                        '<p class="cert-glance-label">난이도</p>' +
                        '<p class="cert-glance-value cert-difficulty-value">' + renderDifficultyDots(item.difficulty_score) + '<span>' + escapeHtml(item.difficulty_label || "정보 확인 중") + '</span></p>' +
                    '</div>' +
                '</div>' +
                '<div class="cert-inline-tip">' + escapeHtml(item.quick_tip || "자세한 수치는 공식 공고에서 최종 확인해주세요.") + '</div>' +
                '<div class="cert-link-group">' + sourceLinks + '</div>' +
                scheduleMarkup +
            '</article>';
    }

    function renderSelectors(items) {
        var favorites = favoritesSet();
        selectorList.innerHTML = items.map(function (item) {
            var urgency = getUrgency(item);
            var distinctionInfo = getDistinctionInfo(item);
            var badges = [];

            if (favorites.has(item.slug)) {
                badges.push('<span class="cert-mini-badge favorite">관심</span>');
            }
            if (hasOpenRegistration(item)) {
                badges.push('<span class="cert-mini-badge status-open">접수중</span>');
            }
            if (urgency.code !== "unknown" && urgency.label) {
                badges.push('<span class="cert-mini-badge ' + getStatusClass(urgency.code) + '">' + escapeHtml(urgency.label) + '</span>');
            }
            badges.push('<span class="cert-mini-badge category-' + getCategoryKey(item) + '">' + escapeHtml((categoryMeta[getCategoryKey(item)] || {}).label || "") + '</span>');

            return '' +
                '<button type="button" class="cert-selector-btn ' + (item.slug === selectedSlug ? "is-active" : "") + '" data-cert-slug="' + escapeHtml(item.slug) + '">' +
                    '<span class="cert-selector-main">' +
                        '<span class="cert-selector-name">' + escapeHtml(displayShortName(item)) + '</span>' +
                        '<span class="cert-selector-sub">' + escapeHtml(getSummaryText(item)) + '</span>' +
                        '<span class="cert-selector-meta">' +
                            '<span>' + escapeHtml(item.source || "공식 사이트") + '</span>' +
                            '<span class="cert-selector-date-pill">' + escapeHtml(formatPrimarySchedule(item)) + '</span>' +
                        '</span>' +
                    '</span>' +
                    '<span class="cert-selector-badges">' + badges.join("") + '</span>' +
                    '<span class="cert-selector-glance">' +
                        '<span class="cert-selector-glance-item"><strong>합격률</strong><span>' + escapeHtml(item.pass_rate || "확인 필요") + '</span></span>' +
                        '<span class="cert-selector-glance-item"><strong>응시료</strong><span>' + escapeHtml(item.exam_fee || "확인 필요") + '</span></span>' +
                    '</span>' +
                    (distinctionInfo
                        ? '<span class="cert-selector-distinction">' + escapeHtml(distinctionInfo.short) + '</span>'
                        : '') +
                    '<span class="cert-selector-foot">' +
                        '<span class="cert-selector-open">' + escapeHtml(item.quick_tip || "클릭해서 자세히 보기") + '</span>' +
                        '<span class="cert-chip ' + getStatusClass(urgency.code) + '">클릭해서 보기</span>' +
                    '</span>' +
                '</button>';
        }).join("");
    }

    function renderPinnedSelectors(items) {
        var favorites = favoritesSet();

        if (!items.length) {
            pinnedList.innerHTML = '<div class="cert-empty">\uace0\uc815\ub41c \ud544\uc218 \uc790\uaca9\uc99d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div>';
            return;
        }

        pinnedList.innerHTML = items.map(function (item) {
            var urgency = getUrgency(item);
            var distinctionInfo = getDistinctionInfo(item);
            var badges = [];

            if (favorites.has(item.slug)) {
                badges.push('<span class="cert-mini-badge favorite">\uad00\uc2ec</span>');
            }
            if (hasOpenRegistration(item)) {
                badges.push('<span class="cert-mini-badge status-open">\uc811\uc218\uc911</span>');
            }
            if (urgency.code !== "unknown" && urgency.label) {
                badges.push('<span class="cert-mini-badge ' + getStatusClass(urgency.code) + '">' + escapeHtml(urgency.label) + '</span>');
            }

            badges.push('<span class="cert-mini-badge category-' + getCategoryKey(item) + '">' + escapeHtml((categoryMeta[getCategoryKey(item)] || {}).label || "") + '</span>');

            return '' +
                '<button type="button" class="cert-selector-btn ' + (item.slug === selectedSlug ? "is-active" : "") + '" data-cert-slug="' + escapeHtml(item.slug) + '">' +
                    '<span class="cert-selector-main">' +
                        '<span class="cert-selector-name">' + escapeHtml(displayShortName(item)) + '</span>' +
                        '<span class="cert-selector-sub">' + escapeHtml(getSummaryText(item)) + '</span>' +
                        '<span class="cert-selector-meta">' +
                            '<span>' + escapeHtml(item.source || "\uacf5\uc2dd \uc0ac\uc774\ud2b8") + '</span>' +
                            '<span class="cert-selector-date-pill">' + escapeHtml(formatPrimarySchedule(item)) + '</span>' +
                        '</span>' +
                    '</span>' +
                    '<span class="cert-selector-badges">' + badges.join("") + '</span>' +
                    '<span class="cert-selector-glance">' +
                        '<span class="cert-selector-glance-item"><strong>\ud569\uaca9\ub960</strong><span>' + escapeHtml(item.pass_rate || "\ud655\uc778 \ud544\uc694") + '</span></span>' +
                        '<span class="cert-selector-glance-item"><strong>\uc751\uc2dc\ub8cc</strong><span>' + escapeHtml(item.exam_fee || "\ud655\uc778 \ud544\uc694") + '</span></span>' +
                    '</span>' +
                    (distinctionInfo
                        ? '<span class="cert-selector-distinction">' + escapeHtml(distinctionInfo.short) + '</span>'
                        : '') +
                    '<span class="cert-selector-foot">' +
                        '<span class="cert-selector-open">' + escapeHtml(item.quick_tip || "\ud074\ub9ad\ud574\uc11c \uc790\uc138\ud788 \ubcf4\uae30") + '</span>' +
                        '<span class="cert-chip ' + getStatusClass(urgency.code) + '">\ud074\ub9ad\ud574\uc11c \ubcf4\uae30</span>' +
                    '</span>' +
                '</button>';
        }).join("");
    }

    function openModal(item) {
        renderDetail(item);
        certModal.classList.add("is-open");
        certModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    }

    function closeModal() {
        certModal.classList.remove("is-open");
        certModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
        if (certModalExternalLink) certModalExternalLink.setAttribute("href", "#");
    }

    function setCalendarFeedback(message, type) {
        calendarFeedback.textContent = message || "";
        calendarFeedback.className = "cert-calendar-feedback" + (type ? " is-" + type : "");
    }

    function closeCalendarModal() {
        selectedCalendarSlug = "";
        calendarModal.classList.remove("is-open");
        calendarModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("calendar-modal-open");
        calendarSelect.innerHTML = "";
        calendarSelect.disabled = false;
        calendarSubmitButton.disabled = false;
        setCalendarFeedback("");
    }

    function openCalendarModal(item) {
        var candidates = getCalendarCandidates(item);

        selectedCalendarSlug = item && item.slug ? item.slug : "";
        calendarCopy.textContent = displayName(item) + " 접수 시작일이나 시험일을 오늘의 계획에 바로 추가할 수 있습니다.";
        calendarSelect.innerHTML = candidates.map(function (candidate) {
            return '<option value="' + escapeHtml(candidate.date) + '" data-label="' + escapeHtml(candidate.label) + '">' +
                escapeHtml(candidate.label + " - " + candidate.display) +
            '</option>';
        }).join("");
        calendarSelect.disabled = !candidates.length;
        calendarSubmitButton.disabled = !candidates.length;
        setCalendarFeedback(candidates.length ? "" : "오늘 이후에 추가할 수 있는 접수/시험 일정이 없습니다.", candidates.length ? "" : "error");

        calendarModal.classList.add("is-open");
        calendarModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("calendar-modal-open");
    }

    function ensureCalendarButtons() {
        [selectorList, pinnedList].forEach(function (container) {
            container.querySelectorAll("[data-cert-slug]").forEach(function (button) {
                var slug = button.getAttribute("data-cert-slug") || "";
                var item = findItemBySlug(slug);
                var foot = button.querySelector(".cert-selector-foot");
                var actionWrap = button.querySelector(".cert-selector-foot-actions");

                if (!item || !foot) return;
                if (!actionWrap) {
                    actionWrap = document.createElement("span");
                    actionWrap.className = "cert-selector-foot-actions";
                    foot.appendChild(actionWrap);
                }

                if (!actionWrap.querySelector("[data-cert-calendar]") && getCalendarCandidates(item).length) {
                    var calendarButton = document.createElement("button");
                    calendarButton.type = "button";
                    calendarButton.className = "cert-calendar-trigger";
                    calendarButton.setAttribute("data-cert-calendar", slug);
                    calendarButton.textContent = "캘린더 추가";
                    actionWrap.insertBefore(calendarButton, actionWrap.firstChild);
                }
            });
        });
    }

    function submitCalendarSelection() {
        var item = findItemBySlug(selectedCalendarSlug);
        var selectedOption = calendarSelect.options[calendarSelect.selectedIndex];
        var selectedDate = calendarSelect.value;
        var selectedLabel = selectedOption ? (selectedOption.getAttribute("data-label") || "") : "";

        if (!item || !selectedDate) {
            setCalendarFeedback("일정 날짜를 먼저 선택해주세요.", "error");
            return;
        }
        if (!plannerGoalUrl) {
            setCalendarFeedback("플래너 연결 주소를 찾지 못했습니다.", "error");
            return;
        }

        calendarSubmitButton.disabled = true;
        setCalendarFeedback("오늘의 계획에 추가하는 중입니다.", "pending");

        fetch(plannerGoalUrl, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "X-CSRFToken": getCsrfToken(),
                "X-Requested-With": "XMLHttpRequest"
            },
            body: new URLSearchParams({
                target_date: selectedDate,
                certification_name: displayName(item),
                schedule_label: selectedLabel,
                color: "yellow"
            })
        })
            .then(function (response) {
                return response.json().catch(function () {
                    return {};
                }).then(function (payload) {
                    return { ok: response.ok, status: response.status, payload: payload };
                });
            })
            .then(function (result) {
                if (result.status === 401 && result.payload && result.payload.login_url) {
                    window.location.href = result.payload.login_url;
                    return;
                }

                if (!result.ok) {
                    throw new Error(result.payload && result.payload.message ? result.payload.message : "플래너 추가에 실패했습니다.");
                }

                setCalendarFeedback(
                    (result.payload.message || "오늘의 계획에 추가되었습니다.") +
                    " 계획/목표에서 " + selectedDate + " 날짜를 확인해보세요.",
                    "success"
                );
                window.setTimeout(function () {
                    closeCalendarModal();
                }, 900);
            })
            .catch(function (error) {
                setCalendarFeedback(error && error.message ? error.message : "플래너 추가에 실패했습니다.", "error");
            })
            .finally(function () {
                if (!calendarModal.classList.contains("is-open")) return;
                calendarSubmitButton.disabled = false;
            });
    }
    function matchesFilter(item) {
        if (currentFilter === "favorites") return favoritesSet().has(item.slug);
        if (currentFilter === "open") return hasOpenRegistration(item);
        if (currentFilter === "urgent") {
            var code = getUrgency(item).code;
            return code === "today" || code === "urgent" || code === "soon";
        }
        return true;
    }

    function matchesSearch(item) {
        var keyword = normalizeSearchText(searchInput.value);
        if (!keyword) return true;

        var searchIndex = buildSearchIndex(item);
        var compactKeyword = compactSearchText(keyword);
        var choseongKeyword = extractChoseong(keyword);

        return (
            searchIndex.normalized.indexOf(keyword) !== -1 ||
            (compactKeyword && searchIndex.compact.indexOf(compactKeyword) !== -1) ||
            (choseongKeyword && searchIndex.choseong.indexOf(choseongKeyword) !== -1)
        );
    }

    function matchesCategory(item) {
        if (currentCategory === "all") return true;
        return getCategoryKey(item) === currentCategory;
    }

    function visibleItems() {
        return sortByUpcomingExam(allItems.filter(function (item) {
            return matchesFilter(item) && matchesSearch(item) && matchesCategory(item);
        }));
    }

    function ensureSelection(items) {
        if (!items.length) {
            selectedSlug = "";
            writeSelectedSlug("");
            return null;
        }
        var chosen = items.find(function (item) { return item.slug === selectedSlug; });
        if (!chosen) {
            selectedSlug = items[0].slug;
            writeSelectedSlug(selectedSlug);
            chosen = items[0];
        }
        return chosen;
    }

    function render() {
        var items = visibleItems();
        var selectedItem = ensureSelection(items);
        renderSelectors(items);
        renderDetail(selectedItem);

        if (!items.length) {
            selectorList.innerHTML = '<div class="cert-empty">조건에 맞는 자격증이 없습니다.</div>';
            detailPanel.innerHTML = '<div class="cert-empty">검색어나 필터를 바꿔서 다시 확인해보세요.</div>';
        }
    }

    function render() {
        var items = visibleItems();
        var pinnedItems = sortByUpcomingExam(allItems.filter(function (item) {
            return isPinnedItem(item) && matchesFilter(item) && matchesSearch(item);
        }));
        var selectorItems = items.filter(function (item) {
            return !isPinnedItem(item);
        });
        var selectedItem = ensureSelection(items);

        renderPinnedSelectors(pinnedItems);
        renderSelectors(selectorItems);
        ensureCalendarButtons();
        renderDetail(selectedItem);

        if (!items.length) {
            pinnedList.innerHTML = '<div class="cert-empty">\uac80\uc0c9 \uc870\uac74\uc5d0 \ub9de\ub294 \ud544\uc218 \uc790\uaca9\uc99d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div>';
            selectorList.innerHTML = '<div class="cert-empty">\uac80\uc0c9 \uc870\uac74\uc5d0 \ub9de\ub294 \uc790\uaca9\uc99d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div>';
            detailPanel.innerHTML = '<div class="cert-empty">검색어나 필터를 바꿔서 다시 확인해보세요.</div>';
        }
    }

    filterButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            currentFilter = button.dataset.filter || "all";
            filterButtons.forEach(function (target) {
                target.classList.toggle("is-active", target === button);
            });
            render();
        });
    });

    categoryButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            currentCategory = button.dataset.category || "all";
            categoryButtons.forEach(function (target) {
                target.classList.toggle("is-active", target === button);
            });
            render();
        });
    });

    searchInput.addEventListener("input", render);

    if (pinnedToggle) {
        setPinnedBrowserExpanded(true);
        pinnedToggle.addEventListener("click", togglePinnedBrowser);
    }

    selectorList.addEventListener("click", function (event) {
        var calendarButton = event.target.closest("[data-cert-calendar]");
        if (calendarButton) {
            event.stopPropagation();
            var calendarItem = findItemBySlug(calendarButton.getAttribute("data-cert-calendar") || "");
            if (calendarItem) {
                openCalendarModal(calendarItem);
            }
            return;
        }

        var selectorButton = event.target.closest("[data-cert-slug]");
        if (!selectorButton) return;
        selectedSlug = selectorButton.getAttribute("data-cert-slug") || "";
        writeSelectedSlug(selectedSlug);
        render();
        openModal(ensureSelection(visibleItems()));
    });

    pinnedList.addEventListener("click", function (event) {
        var calendarButton = event.target.closest("[data-cert-calendar]");
        if (calendarButton) {
            event.stopPropagation();
            var calendarItem = findItemBySlug(calendarButton.getAttribute("data-cert-calendar") || "");
            if (calendarItem) {
                openCalendarModal(calendarItem);
            }
            return;
        }

        var selectorButton = event.target.closest("[data-cert-slug]");
        if (!selectorButton) return;
        selectedSlug = selectorButton.getAttribute("data-cert-slug") || "";
        writeSelectedSlug(selectedSlug);
        render();
        openModal(ensureSelection(visibleItems()));
    });

    detailPanel.addEventListener("click", function (event) {
        var favoriteButton = event.target.closest("[data-favorite-toggle]");
        if (!favoriteButton) return;

        var slug = favoriteButton.getAttribute("data-favorite-toggle") || "";
        var favorites = readFavorites();
        var nextFavorites = favorites.indexOf(slug) === -1
            ? favorites.concat(slug)
            : favorites.filter(function (value) { return value !== slug; });

        writeFavorites(nextFavorites);
        renderStats(allItems);
        render();
        openModal(ensureSelection(visibleItems()));
    });

    certModal.addEventListener("click", function (event) {
        if (event.target.closest("[data-close-cert-modal]")) {
            closeModal();
        }
    });

    calendarModal.addEventListener("click", function (event) {
        if (event.target.closest("[data-close-cert-calendar]")) {
            closeCalendarModal();
        }
    });

    calendarSubmitButton.addEventListener("click", submitCalendarSelection);

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && certModal.classList.contains("is-open")) {
            closeModal();
        }
        if (event.key === "Escape" && calendarModal.classList.contains("is-open")) {
            closeCalendarModal();
        }
    });

    fetch(apiUrl)
        .then(function (response) {
            if (!response.ok) throw new Error("certifications-api");
            return response.json();
        })
        .then(function (payload) {
            allItems = normalizeItems(Array.isArray(payload.items) ? payload.items : []);
            selectedSlug = readSelectedSlug();
            renderLiveAlerts(allItems, payload);
            renderStats(allItems);
            render();
        })
        .catch(function () {
            if (statsPanel) {
                statsPanel.innerHTML = '' +
                    '<div class="cert-stat">' +
                        '<p class="cert-stat-label">불러오기 실패</p>' +
                        '<p class="cert-stat-value">!</p>' +
                        '<p class="cert-stat-copy">잠시 후 다시 시도해주세요.</p>' +
                    '</div>';
            }
            selectorList.innerHTML = '<div class="cert-error">자격증 목록을 불러오지 못했습니다.</div>';
            detailPanel.innerHTML = '<div class="cert-error">공식 자격증 일정 데이터를 불러오지 못했습니다.</div>';
        });
})();
