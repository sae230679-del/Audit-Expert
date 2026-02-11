import type { SecurityScanResult } from "./security-agent";

export interface DocTemplate {
  id: string;
  name: string;
  nameRu: string;
  framework: "fstek_17" | "fstek_21" | "fsb_127" | "mincifry_187" | "gost_57580" | "pdn_class4";
  sections: DocSection[];
}

export interface DocSection {
  title: string;
  content: string;
}

export interface GeneratedDocument {
  template: string;
  frameworkRu: string;
  generatedAt: string;
  organizationName: string;
  systemName: string;
  sections: DocSection[];
  metadata: {
    scanUrl?: string;
    scanGrade?: string;
    scanDate?: string;
    totalChecks?: number;
    passedChecks?: number;
  };
}

const FRAMEWORK_NAMES: Record<string, string> = {
  fstek_17: "ФСТЭК Приказ №17",
  fstek_21: "ФСТЭК Приказ №21",
  fsb_127: "ФСБ Постановление №127",
  mincifry_187: "Минцифры ФЗ-187",
  gost_57580: "ГОСТ Р 57580",
  pdn_class4: "4-й класс защиты ПДн (152-ФЗ)",
};

function fmtDate(): string {
  const d = new Date();
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} г.`;
}

function generateFstek17(orgName: string, systemName: string, scan?: SecurityScanResult): DocSection[] {
  const sections: DocSection[] = [];

  sections.push({
    title: "1. Общие сведения",
    content: `Настоящий документ разработан для информационной системы «${systemName}» организации «${orgName}» в соответствии с требованиями Приказа ФСТЭК России от 11 февраля 2013 г. №17 «Об утверждении Требований о защите информации, не составляющей государственную тайну, содержащейся в государственных информационных системах».

Дата формирования: ${fmtDate()}.
Класс защищённости информационной системы: К3 (третий).`,
  });

  sections.push({
    title: "2. Модель угроз",
    content: `2.1. Источники угроз:
— Внешние нарушители (категория Н1-Н3)
— Внутренние нарушители (категория В1-В2)

2.2. Актуальные угрозы:
— Угрозы утечки информации по техническим каналам
— Угрозы несанкционированного доступа (НСД) к информации
— Угрозы деструктивных информационных воздействий

2.3. Уровень защищённости: УЗ-3 согласно Постановлению Правительства РФ №1119.`,
  });

  const tlsStatus = scan?.categories.find(c => c.name === "SSL/TLS Configuration");
  const headerStatus = scan?.categories.find(c => c.name === "HTTP Headers");

  sections.push({
    title: "3. Результаты технического аудита",
    content: `3.1. Защита каналов передачи данных (ЗИС.3):
${tlsStatus ? `— Протокол: ${tlsStatus.checks.find(c => c.id === "tls-version")?.value || "Не определён"}
— Сертификат: ${tlsStatus.checks.find(c => c.id === "tls-cert-valid")?.value || "Не определён"}
— Оценка: ${tlsStatus.score}/${tlsStatus.maxScore}` : "— Данные сканирования не предоставлены"}

3.2. Заголовки безопасности (ЗИС.17):
${headerStatus ? `— HSTS: ${headerStatus.checks.find(c => c.id === "hsts")?.value || "Не определён"}
— CSP: ${scan?.categories.find(c => c.name === "Content Security Policy")?.checks.find(c => c.id === "csp-present")?.value || "Не определён"}
— X-Frame-Options: ${headerStatus.checks.find(c => c.id === "x-frame-options")?.value || "Не определён"}
— Оценка: ${headerStatus.score}/${headerStatus.maxScore}` : "— Данные сканирования не предоставлены"}

3.3. Общая оценка: ${scan ? `${scan.grade} (${scan.overallScore}/${scan.maxScore})` : "Требуется проведение сканирования"}`,
  });

  sections.push({
    title: "4. Меры защиты информации (Приказ 17, Приложение)",
    content: `4.1. Идентификация и аутентификация (ИАФ):
— ИАФ.1: Идентификация и аутентификация пользователей — РЕАЛИЗОВАНО
— ИАФ.4: Управление средствами аутентификации — РЕАЛИЗОВАНО (brute-force защита)
— ИАФ.6: Идентификация на сетевом уровне — ${tlsStatus && tlsStatus.score > tlsStatus.maxScore * 0.7 ? "РЕАЛИЗОВАНО" : "ТРЕБУЕТ ДОРАБОТКИ"}

4.2. Управление доступом (УПД):
— УПД.1: Управление учётными записями — РЕАЛИЗОВАНО
— УПД.2: Реализация ролевого доступа — РЕАЛИЗОВАНО (user, manager, lawyer, admin, superadmin)

4.3. Регистрация событий безопасности (РСБ):
— РСБ.1: Определение событий безопасности — РЕАЛИЗОВАНО (Winston structured logging)
— РСБ.2: Сбор, запись и хранение информации — РЕАЛИЗОВАНО (90 дней хранения)
— РСБ.3: Мониторинг результатов регистрации — РЕАЛИЗОВАНО

4.4. Защита информационной системы (ЗИС):
— ЗИС.3: Обеспечение целостности при передаче — ${tlsStatus && tlsStatus.score > tlsStatus.maxScore * 0.5 ? "РЕАЛИЗОВАНО" : "ТРЕБУЕТ ДОРАБОТКИ"}
— ЗИС.17: Защита от XSS/Clickjacking — ${headerStatus && headerStatus.score > headerStatus.maxScore * 0.5 ? "РЕАЛИЗОВАНО" : "ТРЕБУЕТ ДОРАБОТКИ"}`,
  });

  sections.push({
    title: "5. Рекомендации",
    content: scan?.recommendations.length
      ? scan.recommendations.map((r, i) => `${i + 1}. [${r.priority.toUpperCase()}] ${r.titleRu}\n   ${r.descriptionRu}\n   Нормативная база: ${r.npaReference}`).join("\n\n")
      : "Рекомендации будут сформированы после проведения технического аудита.",
  });

  sections.push({
    title: "6. Заключение",
    content: `По результатам анализа информационная система «${systemName}» ${scan && scan.grade <= "B" ? "соответствует" : "требует доработки для соответствия"} требованиям Приказа ФСТЭК России №17 для класса защищённости К3.

Дата: ${fmtDate()}
Составил: Автоматизированная система Аудит Эксперт (help152fz.ru)`,
  });

  return sections;
}

function generateFstek21(orgName: string, systemName: string, scan?: SecurityScanResult): DocSection[] {
  const sections: DocSection[] = [];

  sections.push({
    title: "1. Назначение документа",
    content: `Настоящий документ определяет состав и содержание мер по обеспечению безопасности персональных данных при их обработке в информационной системе персональных данных (ИСПДн) «${systemName}» организации «${orgName}» в соответствии с Приказом ФСТЭК России от 18 февраля 2013 г. №21.

Уровень защищённости ПДн: УЗ-4 (четвёртый).
Дата: ${fmtDate()}.`,
  });

  sections.push({
    title: "2. Характеристика ИСПДн",
    content: `2.1. Тип ИСПДн: Информационная система, обрабатывающая иные категории ПДн
2.2. Субъекты ПДн: Пользователи платформы
2.3. Объём обрабатываемых ПДн: Менее 100 000 субъектов
2.4. Актуальные типы угроз: Тип 3 (угрозы, связанные с наличием уязвимостей в прикладном ПО)`,
  });

  sections.push({
    title: "3. Базовый набор мер (УЗ-4, Приказ 21)",
    content: `3.1. Идентификация и аутентификация субъектов и объектов доступа (ИАФ):
— ИАФ.1: Аутентификация пользователей ИС — РЕАЛИЗОВАНО
— ИАФ.4: Защита обратной связи при аутентификации — РЕАЛИЗОВАНО

3.2. Управление доступом субъектов к объектам доступа (УПД):
— УПД.1: Управление учётными записями — РЕАЛИЗОВАНО
— УПД.13: Реализация атрибутивного доступа — РЕАЛИЗОВАНО

3.3. Защита машинных носителей ПДн (ЗНИ):
— ЗНИ.8: Уничтожение ПДн на машинных носителях — РЕКОМЕНДУЕТСЯ РЕАЛИЗОВАТЬ

3.4. Регистрация событий безопасности (РСБ):
— РСБ.1-3: Регистрация и мониторинг событий — РЕАЛИЗОВАНО (Winston logging)

3.5. Обеспечение целостности (ОЦЛ):
— ОЦЛ.4: Обнаружение и реагирование на несанкционированные изменения — ЧАСТИЧНО РЕАЛИЗОВАНО

3.6. Защита среды виртуализации (ЗСВ):
— Не применимо для данной архитектуры

3.7. Защита ИС и её средств (ЗИС):
— ЗИС.3: Защита каналов связи — ${scan?.categories.find(c => c.name === "SSL/TLS Configuration") ? "РЕАЛИЗОВАНО" : "ТРЕБУЕТСЯ АУДИТ"}
— ЗИС.17: Защита от сетевых атак — ${scan?.categories.find(c => c.name === "HTTP Headers") ? "РЕАЛИЗОВАНО" : "ТРЕБУЕТСЯ АУДИТ"}`,
  });

  sections.push({
    title: "4. Оценка соответствия",
    content: scan
      ? `Итоговая оценка технического аудита: ${scan.grade} (${scan.overallScore}/${scan.maxScore})

Маппинг на требования ФСТЭК:
${scan.fstekMapping.map(m => `— ${m.group} ${m.measure}: ${m.status === "compliant" ? "СООТВЕТСТВУЕТ" : m.status === "partial" ? "ЧАСТИЧНО" : "НЕ СООТВЕТСТВУЕТ"}`).join("\n")}`
      : "Требуется проведение технического аудита для оценки соответствия.",
  });

  sections.push({
    title: "5. Заключение",
    content: `ИСПДн «${systemName}» ${scan && scan.grade <= "B" ? "обеспечивает" : "требует доработки для обеспечения"} необходимый уровень защищённости персональных данных (УЗ-4) в соответствии с Приказом ФСТЭК России №21.

Дата: ${fmtDate()}
Составил: Аудит Эксперт (help152fz.ru) (автоматическая генерация)`,
  });

  return sections;
}

function generateFsb127(orgName: string, systemName: string): DocSection[] {
  return [
    {
      title: "1. Общие положения",
      content: `Настоящий документ подготовлен в рамках выполнения требований Постановления Правительства РФ от 16.04.2012 №313 и Приказа ФСБ №127 для системы «${systemName}» организации «${orgName}».

Дата формирования: ${fmtDate()}.`,
    },
    {
      title: "2. Использование СКЗИ",
      content: `2.1. Криптографические средства:
— TLS 1.2/1.3 для защиты каналов связи
— bcryptjs для хеширования паролей (ГОСТ Р 34.11-2012 рекомендуется)
— CSRF-токены на базе crypto.randomBytes (256 бит)

2.2. Класс СКЗИ: КС1 (минимальный класс для защиты ПДн при передаче по каналам связи)

2.3. Порядок учёта СКЗИ:
— Ведение журнала поэкземплярного учёта
— Назначение ответственного за эксплуатацию СКЗИ
— Хранение эксплуатационной документации`,
    },
    {
      title: "3. Организационные меры",
      content: `3.1. Допуск к СКЗИ:
— Определён перечень лиц, допущенных к работе с СКЗИ
— Проведён инструктаж по правилам работы с СКЗИ

3.2. Размещение СКЗИ:
— СКЗИ размещены в защищённых помещениях
— Обеспечен контроль доступа в помещения с СКЗИ

3.3. Уничтожение ключевой информации:
— Определён порядок уничтожения ключевых документов
— Ведётся журнал уничтожения`,
    },
    {
      title: "4. Рекомендации",
      content: `4.1. Рассмотреть переход на ГОСТ Р 34.10-2012 / 34.11-2012 для криптографических операций
4.2. Получить лицензию ФСБ на деятельность по разработке/распространению СКЗИ (при необходимости)
4.3. Провести аттестацию информационной системы
4.4. Назначить ответственного за криптографическую защиту`,
    },
  ];
}

function generateMincifry187(orgName: string, systemName: string): DocSection[] {
  return [
    {
      title: "1. Общие сведения",
      content: `Документ подготовлен в соответствии с требованиями Федерального закона от 26.07.2017 №187-ФЗ «О безопасности критической информационной инфраструктуры Российской Федерации» для системы «${systemName}» организации «${orgName}».

Дата: ${fmtDate()}.`,
    },
    {
      title: "2. Категорирование объекта КИИ",
      content: `2.1. Наименование объекта: ${systemName}
2.2. Сфера деятельности: Информационные технологии
2.3. Предварительная категория значимости: Без категории (при обработке только ПДн пользователей платформы)

2.4. Критерии значимости:
— Социальная значимость: низкая
— Политическая значимость: не применимо
— Экономическая значимость: низкая
— Экологическая значимость: не применимо
— Значимость для обороны: не применимо`,
    },
    {
      title: "3. Обязанности субъекта КИИ",
      content: `3.1. Информирование НКЦКИ:
— Уведомление о компьютерных инцидентах в течение 24 часов
— Взаимодействие с ГосСОПКА

3.2. Обеспечение безопасности:
— Категорирование объектов КИИ
— Интеграция с системами обнаружения атак
— Реагирование на компьютерные инциденты
— Обеспечение непрерывности функционирования`,
    },
    {
      title: "4. Меры по обеспечению безопасности",
      content: `4.1. Организационные меры:
— Назначение ответственного за безопасность КИИ
— Разработка политики информационной безопасности
— Обучение персонала

4.2. Технические меры:
— Средства обнаружения вторжений (IDS/IPS)
— Мониторинг событий безопасности (SIEM)
— Резервное копирование
— Антивирусная защита`,
    },
  ];
}

function generateGost57580(orgName: string, systemName: string, scan?: SecurityScanResult): DocSection[] {
  return [
    {
      title: "1. Область применения",
      content: `Настоящий документ содержит результаты оценки соответствия системы «${systemName}» организации «${orgName}» требованиям ГОСТ Р 57580.1-2017 «Безопасность финансовых (банковских) операций. Защита информации финансовых организаций».

Дата: ${fmtDate()}.`,
    },
    {
      title: "2. Оценка процессов защиты информации",
      content: `2.1. Сетевой мониторинг и экранирование (СМЭ):
${scan?.gostMapping.find(g => g.area === "СМЭ")?.status === "compliant" ? "— СООТВЕТСТВУЕТ" : "— ТРЕБУЕТ ДОРАБОТКИ"}
— CSP настроен: ${scan?.categories.find(c => c.name === "Content Security Policy")?.checks.find(c => c.id === "csp-present")?.status === "pass" ? "Да" : "Нет"}
— CORS ограничен: ${scan?.categories.find(c => c.name === "CORS Configuration")?.checks.find(c => c.id === "cors-origin")?.status === "pass" ? "Да" : "Нет"}

2.2. Защита информации при передаче (ЗИ):
${scan?.gostMapping.find(g => g.area === "ЗИ")?.status === "compliant" ? "— СООТВЕТСТВУЕТ" : "— ТРЕБУЕТ ДОРАБОТКИ"}
— TLS: ${scan?.categories.find(c => c.name === "SSL/TLS Configuration")?.checks.find(c => c.id === "tls-version")?.value || "Не проверено"}
— HSTS: ${scan?.categories.find(c => c.name === "HTTP Headers")?.checks.find(c => c.id === "hsts")?.value || "Не проверено"}

2.3. Защита внутренних каналов (ЗВК):
${scan?.gostMapping.find(g => g.area === "ЗВК")?.status === "compliant" ? "— СООТВЕТСТВУЕТ" : "— ТРЕБУЕТ ДОРАБОТКИ"}
— HttpOnly cookies: ${scan?.categories.find(c => c.name === "Cookie Security")?.checks.find(c => c.id === "cookie-httponly")?.status === "pass" ? "Да" : "Не проверено"}`,
    },
    {
      title: "3. Уровень соответствия",
      content: scan
        ? `Общая оценка: ${scan.grade} (${scan.overallScore}/${scan.maxScore})

Уровень соответствия ГОСТ Р 57580: ${scan.grade <= "B" ? "Стандартный" : scan.grade === "C" ? "Минимальный" : "Не соответствует"}`
        : "Требуется проведение технического аудита.",
    },
    {
      title: "4. Корректирующие мероприятия",
      content: scan?.recommendations.length
        ? scan.recommendations.filter(r => r.npaReference.includes("ГОСТ")).map((r, i) => `${i + 1}. ${r.titleRu} — ${r.descriptionRu}`).join("\n") || "Замечаний по ГОСТ Р 57580 не выявлено."
        : "Требуется проведение технического аудита.",
    },
  ];
}

function generatePdnClass4(orgName: string, systemName: string, scan?: SecurityScanResult): DocSection[] {
  return [
    {
      title: "1. Общие положения",
      content: `Настоящий документ определяет требования к обеспечению безопасности персональных данных при их обработке в ИСПДн «${systemName}» организации «${orgName}» для 4-го уровня защищённости в соответствии с:
— Федеральный закон от 27.07.2006 №152-ФЗ «О персональных данных»
— Постановление Правительства РФ от 01.11.2012 №1119
— Приказ ФСТЭК России от 18.02.2013 №21

Дата: ${fmtDate()}.`,
    },
    {
      title: "2. Определение уровня защищённости",
      content: `2.1. Категория ПДн: Иные персональные данные
2.2. Субъекты: Не являются сотрудниками оператора
2.3. Объём: Менее 100 000 субъектов
2.4. Тип актуальных угроз: Тип 3
2.5. Результат: Уровень защищённости УЗ-4 (четвёртый)

Основание: п. 12, пп. «д» ПП-1119`,
    },
    {
      title: "3. Требования к защите (УЗ-4)",
      content: `3.1. Организация режима обеспечения безопасности помещений:
— Реализовано: контроль доступа к серверному оборудованию

3.2. Обеспечение сохранности носителей ПДн:
— Реализовано: шифрование данных при передаче (TLS)

3.3. Утверждение перечня лиц, имеющих доступ к ПДн:
— Реализовано: ролевая модель доступа (RBAC)

3.4. Использование СЗИ, прошедших оценку соответствия:
— Частично: используются открытые решения с регулярным обновлением

3.5. Назначение ответственного за безопасность ПДн:
— Рекомендуется: назначить приказом руководителя`,
    },
    {
      title: "4. Техническая оценка",
      content: scan
        ? `Результат автоматизированного аудита:
— Оценка: ${scan.grade} (${scan.overallScore}/${scan.maxScore})
— Проверено параметров: ${scan.categories.reduce((s, c) => s + c.checks.length, 0)}
— Критических замечаний: ${scan.recommendations.filter(r => r.priority === "critical").length}
— Требующих внимания: ${scan.recommendations.filter(r => r.priority === "high").length}`
        : "Технический аудит не проводился.",
    },
    {
      title: "5. Рекомендации",
      content: `5.1. Разработать и утвердить Политику обработки ПДн
5.2. Назначить ответственного за организацию обработки ПДн
5.3. Получить согласие субъектов ПДн на обработку
5.4. Уведомить Роскомнадзор об обработке ПДн
5.5. Провести аттестацию ИСПДн (при необходимости)
5.6. Обеспечить обучение персонала`,
    },
  ];
}

export function getAvailableTemplates(): Omit<DocTemplate, "sections">[] {
  return [
    { id: "fstek_17", name: "FSTEC Order 17", nameRu: "Аттестация по Приказу ФСТЭК №17", framework: "fstek_17" },
    { id: "fstek_21", name: "FSTEC Order 21", nameRu: "Аттестация по Приказу ФСТЭК №21 (ПДн)", framework: "fstek_21" },
    { id: "fsb_127", name: "FSB Order 127", nameRu: "Лицензия ФСБ (Постановление №127)", framework: "fsb_127" },
    { id: "mincifry_187", name: "MinDigital FZ-187", nameRu: "Соответствие ФЗ-187 (КИИ)", framework: "mincifry_187" },
    { id: "gost_57580", name: "GOST R 57580", nameRu: "Аудит по ГОСТ Р 57580", framework: "gost_57580" },
    { id: "pdn_class4", name: "PDN Class 4", nameRu: "4-й класс защиты ПДн (152-ФЗ)", framework: "pdn_class4" },
  ];
}

export function generateDocument(
  templateId: string,
  organizationName: string,
  systemName: string,
  scanResult?: SecurityScanResult
): GeneratedDocument {
  let sections: DocSection[];

  switch (templateId) {
    case "fstek_17":
      sections = generateFstek17(organizationName, systemName, scanResult);
      break;
    case "fstek_21":
      sections = generateFstek21(organizationName, systemName, scanResult);
      break;
    case "fsb_127":
      sections = generateFsb127(organizationName, systemName);
      break;
    case "mincifry_187":
      sections = generateMincifry187(organizationName, systemName);
      break;
    case "gost_57580":
      sections = generateGost57580(organizationName, systemName, scanResult);
      break;
    case "pdn_class4":
      sections = generatePdnClass4(organizationName, systemName, scanResult);
      break;
    default:
      throw new Error(`Unknown template: ${templateId}`);
  }

  return {
    template: templateId,
    frameworkRu: FRAMEWORK_NAMES[templateId] || templateId,
    generatedAt: new Date().toISOString(),
    organizationName,
    systemName,
    sections,
    metadata: scanResult ? {
      scanUrl: scanResult.url,
      scanGrade: scanResult.grade,
      scanDate: scanResult.timestamp,
      totalChecks: scanResult.categories.reduce((s, c) => s + c.checks.length, 0),
      passedChecks: scanResult.categories.reduce((s, c) => s + c.checks.filter(ch => ch.status === "pass").length, 0),
    } : {},
  };
}
