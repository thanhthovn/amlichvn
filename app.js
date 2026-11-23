/* Âm Lịch Việt Nam - app.js */
(() => {
  "use strict";

  const PI = Math.PI;
  const TIME_ZONE = 7.0;
  const MIN_YEAR = 1800;
  const MAX_YEAR = 2199;

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const INT = (d) => Math.floor(d);
  const mod = (n, m) => ((n % m) + m) % m;

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ===================== THUẬT TOÁN ÂM LỊCH (HỒ NGỌC ĐỨC) =====================
  function jdFromDate(dd, mm, yy) {
    const a = INT((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    let jd =
      dd +
      INT((153 * m + 2) / 5) +
      365 * y +
      INT(y / 4) -
      INT(y / 100) +
      INT(y / 400) -
      32045;
    if (jd < 2299161) {
      jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    }
    return jd;
  }

  function jdToDate(jd) {
    let a, b, c;
    if (jd > 2299160) {
      a = jd + 32044;
      b = INT((4 * a + 3) / 146097);
      c = a - INT((b * 146097) / 4);
    } else {
      b = 0;
      c = jd + 32082;
    }
    const d = INT((4 * c + 3) / 1461);
    const e = c - INT((1461 * d) / 4);
    const m = INT((5 * e + 2) / 153);
    const day = e - INT((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * INT(m / 10);
    const year = b * 100 + d - 4800 + INT(m / 10);
    return [day, month, year];
  }

  function NewMoon(k) {
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

    let C1 =
      (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
      0.0021 * Math.sin(2 * dr * M);
    C1 -= 0.4068 * Math.sin(Mpr * dr);
    C1 += 0.0161 * Math.sin(2 * Mpr * dr);
    C1 -= 0.0004 * Math.sin(3 * Mpr * dr);
    C1 += 0.0104 * Math.sin(2 * F * dr) - 0.0051 * Math.sin((M + Mpr) * dr);
    C1 -= 0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr);
    C1 -= 0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mpr) * dr);
    C1 += 0.0010 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((2 * Mpr + M) * dr);

    const deltat =
      T < -11
        ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
        : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return Jd1 + C1 - deltat;
  }

  function SunLongitude(jdn) {
    const T = (jdn - 2451545.0) / 36525;
    const T2 = T * T;
    const dr = PI / 180;
    const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL +=
      (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
      0.000290 * Math.sin(dr * 3 * M);
    let L = (L0 + DL) * dr;
    L -= PI * 2 * INT(L / (PI * 2));
    return L;
  }

  function getSunLongitude(dayNumber, timeZone) {
    return INT((SunLongitude(dayNumber - 0.5 - timeZone / 24) / PI) * 6);
  }

  function getNewMoonDay(k, timeZone) {
    return INT(NewMoon(k) + 0.5 + timeZone / 24);
  }

  function getLunarMonth11(yy, timeZone) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = INT(off / 29.530588853);
    let nm = getNewMoonDay(k, timeZone);
    const sunLong = getSunLongitude(nm, timeZone);
    if (sunLong >= 9) nm = getNewMoonDay(k - 1, timeZone);
    return nm;
  }

  function getLeapMonthOffset(a11, timeZone) {
    const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last = 0;
    let i = 1;
    let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    do {
      last = arc;
      i++;
      arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    } while (arc !== last && i < 14);
    return i - 1;
  }

  function convertSolar2Lunar(dd, mm, yy, timeZone = TIME_ZONE) {
    if (!dd || !mm || !yy || dd < 1 || mm < 1 || yy < MIN_YEAR || yy > MAX_YEAR) {
      return [0, 0, 0, 0];
    }

    const dayNumber = jdFromDate(dd, mm, yy);
    const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k + 1, timeZone);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k, timeZone);

    let a11 = getLunarMonth11(yy, timeZone);
    let b11 = a11;
    let lunarYear;

    if (a11 >= monthStart) {
      lunarYear = yy;
      a11 = getLunarMonth11(yy - 1, timeZone);
    } else {
      lunarYear = yy + 1;
      b11 = getLunarMonth11(yy + 1, timeZone);
    }

    const lunarDay = dayNumber - monthStart + 1;
    const diff = INT((monthStart - a11) / 29);
    let lunarMonth = diff + 11;
    let lunarLeap = 0;

    if (b11 - a11 > 365) {
      const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
      if (diff >= leapMonthDiff) {
        lunarMonth = diff + 10;
        if (diff === leapMonthDiff) lunarLeap = 1;
      }
    }

    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

    return [lunarDay, lunarMonth, lunarYear, lunarLeap];
  }

  function convertLunar2Solar(lunarDay, lunarMonth, lunarYear, lunarLeap, timeZone = TIME_ZONE) {
    if (
      lunarMonth < 1 ||
      lunarMonth > 12 ||
      lunarDay < 1 ||
      lunarDay > 30 ||
      lunarYear < MIN_YEAR ||
      lunarYear > MAX_YEAR
    ) {
      return [0, 0, 0];
    }

    let a11, b11;
    if (lunarMonth < 11) {
      a11 = getLunarMonth11(lunarYear - 1, timeZone);
      b11 = getLunarMonth11(lunarYear, timeZone);
    } else {
      a11 = getLunarMonth11(lunarYear, timeZone);
      b11 = getLunarMonth11(lunarYear + 1, timeZone);
    }

    const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
    let off = lunarMonth - 11;
    if (off < 0) off += 12;

    if (b11 - a11 > 365) {
      const leapOff = getLeapMonthOffset(a11, timeZone);
      let leapMonth = leapOff - 2;
      if (leapMonth < 0) leapMonth += 12;

      if (lunarLeap !== 0 && lunarMonth !== leapMonth) {
        return [0, 0, 0];
      }
      if (lunarLeap !== 0 || off >= leapOff) {
        off += 1;
      }
    } else if (lunarLeap !== 0) {
      return [0, 0, 0];
    }

    const monthStart = getNewMoonDay(k + off, timeZone);
    const nextMonthStart = getNewMoonDay(k + off + 1, timeZone);
    if (lunarDay > nextMonthStart - monthStart) {
      return [0, 0, 0];
    }

    return jdToDate(monthStart + lunarDay - 1);
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  // ===================== CAN CHI & GIỜ HOÀNG ĐẠO =====================
  const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
  const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
  const LUNAR_MONTH_NAMES = [
    "",
    "tháng Giêng",
    "tháng Hai",
    "tháng Ba",
    "tháng Tư",
    "tháng Năm",
    "tháng Sáu",
    "tháng Bảy",
    "tháng Tám",
    "tháng Chín",
    "tháng Mười",
    "tháng Mười Một",
    "tháng Chạp"
  ];
  const WEEKDAY_NAMES = [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy"
  ];
  const WEEKDAY_ENGLISH_NAMES = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY"
  ];
  const MONTH_ENGLISH_NAMES = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER"
  ];

  const HOANG_DAO_BY_DAY_CHI = {
    "Tý":   ["Tý", "Dần", "Mão", "Ngọ", "Thân", "Dậu"],
    "Ngọ":  ["Tý", "Dần", "Mão", "Ngọ", "Thân", "Dậu"],
    "Sửu":  ["Dần", "Mão", "Tỵ", "Thân", "Tuất", "Hợi"],
    "Mùi":  ["Dần", "Mão", "Tỵ", "Thân", "Tuất", "Hợi"],
    "Dần":  ["Tý", "Sửu", "Thìn", "Tỵ", "Mùi", "Tuất"],
    "Thân": ["Tý", "Sửu", "Thìn", "Tỵ", "Mùi", "Tuất"],
    "Mão":  ["Tý", "Dần", "Mão", "Ngọ", "Mùi", "Dậu"],
    "Dậu":  ["Tý", "Dần", "Mão", "Ngọ", "Mùi", "Dậu"],
    "Thìn": ["Dần", "Thìn", "Tỵ", "Thân", "Dậu", "Hợi"],
    "Tuất": ["Dần", "Thìn", "Tỵ", "Thân", "Dậu", "Hợi"],
    "Tỵ":   ["Sửu", "Thìn", "Ngọ", "Mùi", "Tuất", "Hợi"],
    "Hợi":  ["Sửu", "Thìn", "Ngọ", "Mùi", "Tuất", "Hợi"]
  };

  const HOUR_RANGES = {
    "Tý": "23h–01h",
    "Sửu": "01h–03h",
    "Dần": "03h–05h",
    "Mão": "05h–07h",
    "Thìn": "07h–09h",
    "Tỵ": "09h–11h",
    "Ngọ": "11h–13h",
    "Mùi": "13h–15h",
    "Thân": "15h–17h",
    "Dậu": "17h–19h",
    "Tuất": "19h–21h",
    "Hợi": "21h–23h"
  };

  function canChiYear(year) {
    return `${CAN[mod(year + 6, 10)]} ${CHI[mod(year + 8, 12)]}`;
  }

  function canChiDay(d, m, y) {
    const jd = jdFromDate(d, m, y);
    return `${CAN[mod(jd + 9, 10)]} ${CHI[mod(jd + 1, 12)]}`;
  }

  function canChiMonth(lunarMonth, lunarYear) {
    if (!lunarMonth || lunarMonth < 1 || lunarMonth > 12) return "Tháng không hợp lệ";
    const yearCan = mod(lunarYear + 6, 10);
    const firstMonthCanMap = [2, 4, 6, 8, 0];
    const firstMonthCan = firstMonthCanMap[yearCan % 5];
    const canIndex = (firstMonthCan + lunarMonth - 1) % 10;
    const chiIndex = (lunarMonth + 1) % 12;
    return `${CAN[canIndex]} ${CHI[chiIndex]}`;
  }

  function getGioHoangDao(d, m, y) {
    const dayCanChi = canChiDay(d, m, y);
    const parts = dayCanChi.split(" ");
    const dayChi = parts.length > 1 ? parts[1] : "Tý";
    const hoangDao = new Set(HOANG_DAO_BY_DAY_CHI[dayChi] || []);
    return CHI.map((chi) => ({
      chi,
      range: HOUR_RANGES[chi],
      isHoangDao: hoangDao.has(chi)
    }));
  }

  function renderGioHoangDao(d, m, y) {
    const box = $("auspiciousHours");
    const hoangDaoText = $("hoangDaoText");
    const hacDaoText = $("hacDaoText");
    if (!box || !hoangDaoText || !hacDaoText) return;

    const hours = getGioHoangDao(d, m, y);
    const toBadge = (hour) => `<span class="hour-badge">${hour.chi} (${hour.range})</span>`;

    hoangDaoText.innerHTML =
      hours.filter((h) => h.isHoangDao).map(toBadge).join(" ") || "Không có giờ Hoàng Đạo";
    hacDaoText.innerHTML =
      hours.filter((h) => !h.isHoangDao).map(toBadge).join(" ") || "Không có giờ Hắc Đạo";
    box.hidden = false;
  }

  // ===================== DỮ LIỆU NGÀY LỄ (fixed.js) =====================
  const DEFAULT_HOLIDAY_DATA = {
    FIXED_HOLIDAYS: {},
    FIXED_BIRTHDAY: {},
    LUNAR_HOLIDAYS: {},
    LUNAR_ANNIVERSARY: {}
  };

  let HOLIDAY_DATA = DEFAULT_HOLIDAY_DATA;

  function loadHolidayData() {
    if (window.HOLIDAY_DATA && typeof window.HOLIDAY_DATA === "object") {
      HOLIDAY_DATA = {
        FIXED_HOLIDAYS: window.HOLIDAY_DATA.FIXED_HOLIDAYS || {},
        FIXED_BIRTHDAY: window.HOLIDAY_DATA.FIXED_BIRTHDAY || {},
        LUNAR_HOLIDAYS: window.HOLIDAY_DATA.LUNAR_HOLIDAYS || {},
        LUNAR_ANNIVERSARY: window.HOLIDAY_DATA.LUNAR_ANNIVERSARY || {}
      };
    } else {
      console.warn("⚠️ fixed.js chưa load hoặc lỗi cú pháp. Dùng dữ liệu rỗng.");
      HOLIDAY_DATA = DEFAULT_HOLIDAY_DATA;
    }
  }

  function getNthWeekdayOfMonth(year, month, weekday, nth) {
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(weekday) ||
      !Number.isInteger(nth) ||
      month < 1 ||
      month > 12 ||
      weekday < 0 ||
      weekday > 6 ||
      nth < 1 ||
      year < 1 ||
      year > 9999
    ) {
      return null;
    }
    const first = new Date(year, month - 1, 1);
    if (isNaN(first.getTime())) return null;
    const offset = (weekday - first.getDay() + 7) % 7;
    const day = 1 + offset + (nth - 1) * 7;
    return day <= daysInMonth(year, month) ? day : null;
  }

  function getDynamicHoliday(d, m, y) {
    const holidays = [];
    const motherDay = getNthWeekdayOfMonth(y, 5, 0, 2);
    if (m === 5 && motherDay !== null && d === motherDay) {
      holidays.push("Ngày của mẹ");
    }
    const fatherDay = getNthWeekdayOfMonth(y, 6, 0, 3);
    if (m === 6 && fatherDay !== null && d === fatherDay) {
      holidays.push("Ngày của cha");
    }
    return holidays;
  }

  function getFixedBirthday(d, m) {
    return HOLIDAY_DATA.FIXED_BIRTHDAY[`${d}-${m}`] || "";
  }

  function getLunarHoliday(lunar) {
    if (!lunar || lunar[3]) return "";
    return HOLIDAY_DATA.LUNAR_HOLIDAYS[`${lunar[0]}-${lunar[1]}`] || "";
  }

  function getLunarAnniversary(lunar) {
    if (!lunar || lunar[3]) return "";
    return HOLIDAY_DATA.LUNAR_ANNIVERSARY[`${lunar[0]}-${lunar[1]}`] || "";
  }

  function getHoliday(d, m, lunar, solarYear = new Date().getFullYear()) {
    const holidays = [];
    const fixed = HOLIDAY_DATA.FIXED_HOLIDAYS[`${d}-${m}`];
    const lunarHoliday = getLunarHoliday(lunar);

    if (fixed) holidays.push(fixed);
    if (lunarHoliday) holidays.push(lunarHoliday);
    holidays.push(...getDynamicHoliday(d, m, solarYear));

    return holidays.join(" • ");
  }

  function formatLunar(lunar) {
    if (!lunar || lunar[0] === 0) return "--/--";
    return `${lunar[0]}/${lunar[1]}${lunar[3] ? " nhuận" : ""}`;
  }

  function formatLunarSummary(lunar) {
    if (!lunar || lunar[0] === 0) return "--/-- ÂL";
    const prefix = lunar[0] <= 10 ? "Mùng" : "Ngày";
    return `${prefix} ${formatLunar(lunar)} ÂL`;
  }

  function validSolar(d, m, y) {
    if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return false;
    if (y < MIN_YEAR || y > MAX_YEAR || m < 1 || m > 12 || d < 1) return false;
    if (d > daysInMonth(y, m)) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }

  function getVietnamToday() {
    try {
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
      const vietnam = new Date(utcMs + TIME_ZONE * 60 * 60 * 1000);
      return {
        year: vietnam.getUTCFullYear(),
        month: vietnam.getUTCMonth() + 1,
        day: vietnam.getUTCDate()
      };
    } catch {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate()
      };
    }
  }

  function makeCalendarDate(year, month, day) {
    return new Date(year, month - 1, day);
  }

  // ===================== DANH SÁCH NGÀY LỄ TRONG NĂM =====================
  function getAllHolidays(year) {
    const holidays = [];
    const seen = new Set();

    // 1. Lễ Dương lịch cố định
    for (const [key, name] of Object.entries(HOLIDAY_DATA.FIXED_HOLIDAYS)) {
      const [d, m] = key.split("-").map(Number);
      const uniqueKey = `solar-${key}`;
      if (seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      const lunar = convertSolar2Lunar(d, m, year);
      holidays.push({
        type: "solar",
        date: `${pad(d)}/${pad(m)}`,
        name,
        lunarDate: lunar[0] > 0 ? `${pad(lunar[0])}/${pad(lunar[1])}` : "",
        sortYear: year,
        sortMonth: m,
        sortDay: d
      });
    }

    // 2. Lễ Dương lịch động (Ngày của mẹ, Ngày của cha)
    const dynamicDates = [
      { d: getNthWeekdayOfMonth(year, 5, 0, 2), m: 5, name: "Ngày của mẹ" },
      { d: getNthWeekdayOfMonth(year, 6, 0, 3), m: 6, name: "Ngày của cha" }
    ];
    for (const item of dynamicDates) {
      if (!item.d) continue;
      const lunar = convertSolar2Lunar(item.d, item.m, year);
      holidays.push({
        type: "solar",
        date: `${pad(item.d)}/${pad(item.m)}`,
        name: item.name,
        lunarDate: lunar[0] > 0 ? `${pad(lunar[0])}/${pad(lunar[1])}` : "",
        sortYear: year,
        sortMonth: item.m,
        sortDay: item.d
      });
    }

    // 3. Sinh nhật Dương lịch
    for (const [key, name] of Object.entries(HOLIDAY_DATA.FIXED_BIRTHDAY)) {
      const [d, m] = key.split("-").map(Number);
      const uniqueKey = `birthday-${key}`;
      if (seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      const lunar = convertSolar2Lunar(d, m, year);
      holidays.push({
        type: "birthday",
        date: `${pad(d)}/${pad(m)}`,
        name: `🎂 ${name}`,
        lunarDate: lunar[0] > 0 ? `${pad(lunar[0])}/${pad(lunar[1])}` : "",
        sortYear: year,
        sortMonth: m,
        sortDay: d
      });
    }

    // 4. Lễ Âm lịch
    for (const [key, name] of Object.entries(HOLIDAY_DATA.LUNAR_HOLIDAYS)) {
      const [d, m] = key.split("-").map(Number);
      const uniqueKey = `lunar-holiday-${key}`;
      if (seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      const solar = convertLunar2Solar(d, m, year, 0);
      const hasSolar = solar[0] > 0;
      const solarDate = hasSolar
        ? `${pad(solar[0])}/${pad(solar[1])}${solar[2] !== year ? `/${solar[2]}` : ""}`
        : "";
      holidays.push({
        type: "lunar",
        date: `${pad(d)}/${pad(m)} (ÂL)`,
        name,
        lunarDate: `${pad(d)}/${pad(m)}`,
        solarDate,
        sortYear: hasSolar ? solar[2] : year,
        sortMonth: hasSolar ? solar[1] : m,
        sortDay: hasSolar ? solar[0] : d
      });
    }

    // 5. Giỗ kỷ niệm Âm lịch
    for (const [key, name] of Object.entries(HOLIDAY_DATA.LUNAR_ANNIVERSARY)) {
      const [d, m] = key.split("-").map(Number);
      const uniqueKey = `anniversary-${key}`;
      if (seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      const solar = convertLunar2Solar(d, m, year, 0);
      const hasSolar = solar[0] > 0;
      const solarDate = hasSolar
        ? `${pad(solar[0])}/${pad(solar[1])}${solar[2] !== year ? `/${solar[2]}` : ""}`
        : "";
      holidays.push({
        type: "anniversary",
        date: `${pad(d)}/${pad(m)} (ÂL)`,
        name: `🕯️ ${name}`,
        lunarDate: `${pad(d)}/${pad(m)}`,
        solarDate,
        sortYear: hasSolar ? solar[2] : year,
        sortMonth: hasSolar ? solar[1] : m,
        sortDay: hasSolar ? solar[0] : d
      });
    }

    holidays.sort((a, b) => {
      if (a.sortYear !== b.sortYear) return a.sortYear - b.sortYear;
      if (a.sortMonth !== b.sortMonth) return a.sortMonth - b.sortMonth;
      return a.sortDay - b.sortDay;
    });

    return holidays;
  }

  function renderHolidaysList(year) {
    const container = $("holidaysContent");
    if (!container) return;

    const title = $("holidaysTitle");
    if (title) {
      title.innerHTML = `<span>🧠</span> DANH SÁCH NGÀY LỄ - SỰ KIỆN NĂM ${year}`;
    }

    const holidays = getAllHolidays(year);
    if (holidays.length === 0) {
      container.innerHTML = '<div class="no-data">Không có ngày lễ nào trong năm này.</div>';
      return;
    }

    const typeLabels = {
      solar: '<span class="badge badge-solar">Dương lịch</span>',
      lunar: '<span class="badge badge-lunar">Âm lịch</span>',
      birthday: '<span class="badge badge-birthday">Sinh nhật</span>',
      anniversary: '<span class="badge badge-anniversary">Ngày Giỗ</span>'
    };

    const rowsHtml = holidays
      .map((item) => {
        const typeLabel = typeLabels[item.type] || "";
        let refDisplay = item.lunarDate || "";
        if (item.solarDate && (item.type === "lunar" || item.type === "anniversary")) {
          refDisplay = `${item.lunarDate} (DL: ${item.solarDate})`;
        }
        return `
          <tr>
            <td class="date-col">${escapeHtml(item.date)}</td>
            <td>${typeLabel}</td>
            <td class="name-col">${escapeHtml(item.name)}</td>
            <td>${escapeHtml(refDisplay) || "—"}</td>
          </tr>
        `;
      })
      .join("");

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th style="width:16%">Ngày</th>
            <th style="width:16%">Loại</th>
            <th style="width:43%">Tên sự kiện</th>
            <th style="width:25%">Quy đổi</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
  }

  function showHolidaysModal() {
    const modal = $("holidaysModal");
    if (!modal) return;
    renderHolidaysList(current.getFullYear());
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    const closeBtn = $("closeHolidaysModal");
    if (closeBtn) closeBtn.focus();
  }

  function closeHolidaysModal() {
    const modal = $("holidaysModal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }

  function closeDayModal() {
    const modal = $("selectedDayModal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }

  // ===================== NGÀY TỐT / XẤU NĂM ÂM LỊCH 2027 =====================
  function getTotXau2027(d, m, y, lunar) {
    if (
      typeof lichTotXau2027 === "undefined" ||
      !Array.isArray(lunar) ||
      lunar[2] !== 2027 ||
      lunar[3] !== 0 ||
      !Number.isInteger(lunar[1])
    ) {
      return null;
    }

    const thang = lichTotXau2027.thangAm?.[String(lunar[1])];
    if (!thang || !Array.isArray(thang.ngay)) return null;

    // Ưu tiên khớp theo chỉ số ngày Âm (lunar[0] - 1) và kiểm tra lại ngày Dương để tránh trùng ngày khi tháng Âm trải qua 2 tháng Dương.
    const byIndex = thang.ngay[lunar[0] - 1];
    if (byIndex && byIndex.duongLich != null) {
      const parts = String(byIndex.duongLich).trim().split("/").map(Number);
      const matchesSolar =
        (parts.length === 2 && parts[0] === d && parts[1] === m) ||
        (parts.length === 1 && parts[0] === d);
      if (matchesSolar) return byIndex;
    }

    // Dự phòng: tìm trong mảng ngày của tháng Âm đó.
    const found = thang.ngay.find((item) => {
      if (!item || item.duongLich == null) return false;
      const parts = String(item.duongLich).trim().split("/").map(Number);
      if (parts.length === 2 && parts.every(Number.isFinite)) {
        return parts[0] === d && parts[1] === m;
      }
      return parts.length === 1 && parts[0] === d;
    });

    return found || null;
  }

  function renderTotXau2027(d, m, y, lunar) {
    const statusEl = $("totXauMainStatus");
    const contentEl = $("totXauMainContent");
    const dateEl = $("totXauMainDate");
    if (!statusEl || !contentEl) return;

    if (dateEl) dateEl.textContent = `${pad(d)}/${pad(m)}/${y}`;

    const isLunar2027 = Array.isArray(lunar) && lunar[2] === 2027;
    const data = getTotXau2027(d, m, y, lunar);

    if (!data) {
      statusEl.className = "tot-xau-status neutral";
      statusEl.textContent = isLunar2027
        ? "CHƯA CÓ DỮ LIỆU NGÀY TỐT / XẤU"
        : "DỮ LIỆU HIỆN CHỈ CÓ NĂM ÂM LỊCH 2027";
      contentEl.innerHTML = isLunar2027
        ? `<div class="tot-xau-unavailable">Không tìm thấy bản ghi tương ứng trong dữ liệu ngày tốt / xấu 2027.</div>`
        : `<div class="tot-xau-unavailable">Vui lòng chọn ngày thuộc năm Âm lịch 2027 (06/02/2027 – 25/01/2028) để xem dữ liệu từ file <strong>lichtotxau2027.js</strong>.</div>`;
      return;
    }

    const ketLuan = data.totXau;
    if (ketLuan === "Tốt" || ketLuan === "Xấu") {
      const statusClass = ketLuan === "Tốt" ? "good" : "bad";
      statusEl.className = `tot-xau-status ${statusClass}`;
      statusEl.textContent = `NGÀY ${ketLuan.toUpperCase()}`;
    } else {
      statusEl.className = "tot-xau-status neutral";
      statusEl.textContent = "NGÀY BÌNH THƯỜNG";
    }

    const vanXau = data.vanXauKhac || "Không ghi chú";
    contentEl.innerHTML = `
      <div class="tot-xau-grid">
        <div class="tot-xau-item">
          <span>Sao</span>
          <strong>${escapeHtml(data.sao || "—")}</strong>
        </div>
        <div class="tot-xau-item">
          <span>Lục Nhâm</span>
          <strong>${escapeHtml(data.lucNham || "—")}</strong>
        </div>
        <div class="tot-xau-item">
          <span>Vận xấu khác</span>
          <strong>${escapeHtml(vanXau)}</strong>
        </div>
      </div>
    `;
  }

  // ===================== HIỂN THỊ LỊCH THÁNG & LỊCH BLOCK =====================
  const vietnamToday = getVietnamToday();
  let current = makeCalendarDate(vietnamToday.year, vietnamToday.month, 1);
  const todayKey = `${vietnamToday.year}-${vietnamToday.month}-${vietnamToday.day}`;
  let selectedDateKey = null;
  let lastClickedDateKey = null;

  function buildDayCellHtml(d, lunar, holiday, birthday, anniversary) {
    return `
      <span class="solar">${d}</span>
      <span class="lunar">${escapeHtml(formatLunar(lunar))}</span>
      ${holiday ? `<span class="holiday">${escapeHtml(holiday)}</span>` : ""}
      ${birthday ? `<span class="birthday">🎂 ${escapeHtml(birthday)}</span>` : ""}
      ${anniversary ? `<span class="anniversary">🕯️ ${escapeHtml(anniversary)}</span>` : ""}
    `;
  }

  function updateSelectedCellHighlight(newKey) {
    const tbody = $("calendarGrid");
    if (!tbody) return;
    const prev = tbody.querySelector("td.selected-date");
    if (prev) {
      prev.classList.remove("selected-date");
      prev.setAttribute("aria-selected", "false");
    }
    if (newKey) {
      const next = tbody.querySelector(`td[data-date="${newKey}"]`);
      if (next) {
        next.classList.add("selected-date");
        next.setAttribute("aria-selected", "true");
      }
    }
  }

  function renderCalendar() {
    const y = current.getFullYear();
    const m = current.getMonth() + 1;

    $("monthYear").textContent = `Tháng ${m} Năm ${y}`;

    const firstDay = makeCalendarDate(y, m, 1);
    const mondayIndex = (firstDay.getDay() + 6) % 7;
    const total = daysInMonth(y, m);
    const tbody = $("calendarGrid");

    tbody.innerHTML = "";
    const fragment = document.createDocumentFragment();
    let row = document.createElement("tr");
    let count = 0;

    // Các ngày cuối tháng trước
    const prevMonthDate = new Date(y, m - 2, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth() + 1;
    const prevTotal = daysInMonth(prevYear, prevMonth);

    for (let i = mondayIndex - 1; i >= 0; i--) {
      const d = prevTotal - i;
      const lunar = convertSolar2Lunar(d, prevMonth, prevYear);
      const holiday = getHoliday(d, prevMonth, lunar, prevYear);
      const birthday = getFixedBirthday(d, prevMonth);
      const anniversary = getLunarAnniversary(lunar);

      const td = document.createElement("td");
      td.className = "day adjacent-day";
      td.innerHTML = buildDayCellHtml(d, lunar, holiday, birthday, anniversary);
      td.title = `${d}/${prevMonth}/${prevYear} (tháng trước)`;
      row.appendChild(td);
      count++;
    }

    // Các ngày trong tháng hiện tại
    for (let d = 1; d <= total; d++) {
      const lunar = convertSolar2Lunar(d, m, y);
      const holiday = getHoliday(d, m, lunar, y);
      const birthday = getFixedBirthday(d, m);
      const anniversary = getLunarAnniversary(lunar);

      const date = makeCalendarDate(y, m, d);
      const weekday = date.getDay();
      const key = `${y}-${m}-${d}`;

      const td = document.createElement("td");
      td.className = "day";
      td.tabIndex = 0;
      td.setAttribute("role", "button");
      td.dataset.date = key;
      td.dataset.day = String(d);
      td.dataset.month = String(m);
      td.dataset.year = String(y);

      if (weekday === 0 || weekday === 6) {
        td.classList.add("weekend");
      }

      if (key === todayKey) {
        td.classList.add("today");
        td.setAttribute("aria-current", "date");
      }

      if (selectedDateKey && key === selectedDateKey) {
        td.classList.add("selected-date");
        td.setAttribute("aria-selected", "true");
      } else {
        td.setAttribute("aria-selected", "false");
      }

      td.innerHTML = buildDayCellHtml(d, lunar, holiday, birthday, anniversary);
      td.title =
        `${d}/${m}/${y} → ${lunar[0]}/${lunar[1]}/${lunar[2]}` +
        (lunar[3] ? " (tháng nhuận)" : "") +
        (holiday ? ` • ${holiday}` : "");

      row.appendChild(td);
      count++;

      if (count === 7) {
        fragment.appendChild(row);
        row = document.createElement("tr");
        count = 0;
      }
    }

    // Các ngày đầu tháng sau
    if (count > 0) {
      const nextMonthDate = new Date(y, m, 1);
      const nextYear = nextMonthDate.getFullYear();
      const nextMonth = nextMonthDate.getMonth() + 1;
      let nextDay = 1;

      while (count < 7) {
        const lunar = convertSolar2Lunar(nextDay, nextMonth, nextYear);
        const holiday = getHoliday(nextDay, nextMonth, lunar, nextYear);
        const birthday = getFixedBirthday(nextDay, nextMonth);
        const anniversary = getLunarAnniversary(lunar);

        const td = document.createElement("td");
        td.className = "day adjacent-day";
        td.innerHTML = buildDayCellHtml(nextDay, lunar, holiday, birthday, anniversary);
        td.title = `${nextDay}/${nextMonth}/${nextYear} (tháng sau)`;
        row.appendChild(td);
        nextDay++;
        count++;
      }

      fragment.appendChild(row);
    }

    tbody.appendChild(fragment);

    const displayedMonthLunar = convertSolar2Lunar(1, m, y);
    $("monthLunarInfo").textContent =
      `Tháng ${canChiMonth(displayedMonthLunar[1], displayedMonthLunar[2])} • Năm ${canChiYear(displayedMonthLunar[2])}`;
  }

  function handleDayCellSelect(td) {
    const d = Number(td.dataset.day);
    const m = Number(td.dataset.month);
    const y = Number(td.dataset.year);
    const newKey = td.dataset.date;
    if (!newKey || !d || !m || !y) return;

    const lunar = convertSolar2Lunar(d, m, y);

    if (lastClickedDateKey === newKey && selectedDateKey === newKey) {
      showSelectedDate(d, m, y, lunar, true);
    } else {
      selectedDateKey = newKey;
      lastClickedDateKey = newKey;
      updateSelectedCellHighlight(newKey);
      showSelectedDate(d, m, y, lunar, false);
    }
  }

  function showSelectedDate(d, m, y, lunar, openModal = true) {
    selectedDateKey = `${y}-${m}-${d}`;

    const date = makeCalendarDate(y, m, d);
    const dayOfWeek = date.getDay();
    const solarHoliday = HOLIDAY_DATA.FIXED_HOLIDAYS[`${d}-${m}`] || "";
    const fixedBirthday = getFixedBirthday(d, m);
    const dynamicHoliday = getDynamicHoliday(d, m, y).join(" • ");
    const holiday = [solarHoliday, dynamicHoliday].filter(Boolean).join(" • ");
    const lunarHolidayText = getLunarHoliday(lunar);
    const lunarAnniversaryText = getLunarAnniversary(lunar);

    $("todayTitle").textContent = `${pad(d)}-${pad(m)}-${y}`;
    $("todaySummary").textContent =
      `[${formatLunarSummary(lunar)}] Ngày ${canChiDay(d, m, y)} • Tháng ${canChiMonth(lunar[1], lunar[2])} • Năm ${canChiYear(lunar[2])}` +
      (holiday ? ` • 🎉 ${holiday}` : "") +
      (fixedBirthday ? ` • 🎂 ${fixedBirthday}` : "");

    const titleEl = $("selectedDayTitle");
    if (titleEl) {
      titleEl.textContent = `${WEEKDAY_NAMES[dayOfWeek]} • ${pad(d)}/${pad(m)}/${y}`;
    }

    const yearEl = $("selectedYear");
    if (yearEl) yearEl.textContent = y;

    const monthLabelEl = $("selectedMonthLabel");
    if (monthLabelEl) monthLabelEl.textContent = `THÁNG ${m}`;

    const monthEnglishEl = $("selectedMonthEnglish");
    if (monthEnglishEl) monthEnglishEl.textContent = MONTH_ENGLISH_NAMES[m - 1];

    const weekdayEl = $("selectedWeekday");
    if (weekdayEl) {
      weekdayEl.innerHTML =
        `<span class="weekday-box weekday-vietnamese">${WEEKDAY_NAMES[dayOfWeek].toUpperCase()}</span>` +
        `<span class="weekday-yinyang" aria-hidden="true">☯</span>` +
        `<span class="weekday-box weekday-english">${WEEKDAY_ENGLISH_NAMES[dayOfWeek]}</span>`;
    }

    const solarDayEl = $("selectedSolarDay");
    if (solarDayEl) {
      solarDayEl.textContent = d;
      solarDayEl.className = "day-block-number";
      if (solarHoliday) {
        solarDayEl.classList.add("solar-holiday");
      } else if (dayOfWeek === 6) {
        solarDayEl.classList.add("weekday-saturday");
      } else if (dayOfWeek === 0) {
        solarDayEl.classList.add("weekday-sunday");
      } else {
        solarDayEl.classList.add("weekday-weekday");
      }
    }

    const lunarDayEl = $("selectedLunarDay");
    if (lunarDayEl) {
      lunarDayEl.textContent = lunar[0];
      lunarDayEl.className = "lunar-number";
      if (dayOfWeek === 6) {
        lunarDayEl.classList.add("weekday-saturday");
      } else if (dayOfWeek === 0) {
        lunarDayEl.classList.add("weekday-sunday");
      } else {
        lunarDayEl.classList.add("weekday-weekday");
      }
      if (lunarHolidayText) {
        lunarDayEl.classList.add("lunar-holiday");
      }
    }

    const monthName = LUNAR_MONTH_NAMES[lunar[1]] || `Tháng ${lunar[1]}`;
    const lunarMonthEl = $("selectedLunarMonth");
    if (lunarMonthEl) {
      lunarMonthEl.textContent = `${monthName.toUpperCase()}${lunar[3] ? " (N)" : ""}`;
    }

    const canChiDayEl = $("selectedCanChiDay");
    if (canChiDayEl) canChiDayEl.textContent = canChiDay(d, m, y);

    const canChiMonthEl = $("selectedCanChiMonth");
    if (canChiMonthEl) canChiMonthEl.textContent = canChiMonth(lunar[1], lunar[2]);

    const canChiYearEl = $("selectedCanChiYear");
    if (canChiYearEl) canChiYearEl.textContent = canChiYear(lunar[2]);

    const lunarInfoHolidayEl = $("selectedLunarHoliday");
    const lunarInfoHolidayRow = lunarInfoHolidayEl
      ? lunarInfoHolidayEl.closest(".lunar-holiday-row")
      : null;

    if (lunarInfoHolidayEl) {
      lunarInfoHolidayEl.classList.remove("anniversary-text");
      if (lunarInfoHolidayRow) lunarInfoHolidayRow.classList.remove("anniversary-row");

      const lunarParts = [];
      if (lunarHolidayText) lunarParts.push(escapeHtml(lunarHolidayText));
      if (lunarAnniversaryText) lunarParts.push(`🕯️ ${escapeHtml(lunarAnniversaryText)}`);

      if (lunarParts.length > 0) {
        lunarInfoHolidayEl.innerHTML = lunarParts.join("<br>");
        if (lunarAnniversaryText && !lunarHolidayText) {
          lunarInfoHolidayEl.classList.add("anniversary-text");
          if (lunarInfoHolidayRow) lunarInfoHolidayRow.classList.add("anniversary-row");
        }
      } else {
        lunarInfoHolidayEl.textContent = "—";
      }
    }

    renderTotXau2027(d, m, y, lunar);
    renderGioHoangDao(d, m, y);

    const holidayEl = $("selectedHoliday");
    if (holidayEl) {
      const holidayParts = [
        holiday ? `<span>🎉 ${escapeHtml(holiday)}</span>` : "",
        fixedBirthday ? `<span class="selected-birthday">🎂 ${escapeHtml(fixedBirthday)}</span>` : ""
      ].filter(Boolean);

      if (holidayParts.length) {
        holidayEl.innerHTML = holidayParts.join("<br>");
        holidayEl.hidden = false;
      } else {
        holidayEl.textContent = "";
        holidayEl.hidden = true;
      }
    }

    if (openModal) {
      const modal = $("selectedDayModal");
      if (modal) {
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");
        const closeBtn = $("closeSelectedDay");
        if (closeBtn) closeBtn.focus();
      }
    }
  }

  // ===================== TÌM NGÀY & CHUYỂN ĐỔI =====================
  function searchDateClick() {
    const d = Number($("searchDay").value);
    const m = Number($("searchMonth").value);
    const y = Number($("searchYear").value);

    if (!validSolar(d, m, y)) {
      alert(`Vui lòng nhập ngày, tháng, năm Dương lịch hợp lệ (năm ${MIN_YEAR}–${MAX_YEAR}).`);
      return;
    }

    selectedDateKey = `${y}-${m}-${d}`;
    lastClickedDateKey = selectedDateKey;
    current = makeCalendarDate(y, m, 1);
    const lunar = convertSolar2Lunar(d, m, y);

    renderCalendar();
    showSelectedDate(d, m, y, lunar, false);

    $("calendarGrid").closest(".calendar-card").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function resetToToday() {
    selectedDateKey = todayKey;
    lastClickedDateKey = todayKey;
    current = makeCalendarDate(vietnamToday.year, vietnamToday.month, 1);
    const lunar = convertSolar2Lunar(vietnamToday.day, vietnamToday.month, vietnamToday.year);
    renderCalendar();
    showSelectedDate(vietnamToday.day, vietnamToday.month, vietnamToday.year, lunar, false);
  }

  function setDefaultConverterValues() {
    $("searchDay").value = vietnamToday.day;
    $("searchMonth").value = vietnamToday.month;
    $("searchYear").value = vietnamToday.year;

    $("solarDay").value = vietnamToday.day;
    $("solarMonth").value = vietnamToday.month;
    $("solarYear").value = vietnamToday.year;

    const lunar = convertSolar2Lunar(vietnamToday.day, vietnamToday.month, vietnamToday.year);
    $("lunarDay").value = lunar[0];
    $("lunarMonth").value = lunar[1];
    $("lunarYear").value = lunar[2];
    $("lunarLeap").checked = !!lunar[3];
  }

  function convertSolarClick() {
    const d = Number($("solarDay").value);
    const m = Number($("solarMonth").value);
    const y = Number($("solarYear").value);

    if (!validSolar(d, m, y)) {
      $("solarResult").textContent = `Ngày Dương lịch không hợp lệ (hỗ trợ năm ${MIN_YEAR}–${MAX_YEAR}).`;
      return;
    }

    const lunar = convertSolar2Lunar(d, m, y);
    $("solarResult").innerHTML =
      `<strong>${pad(d)}/${pad(m)}/${y}</strong> Dương lịch = ` +
      `<strong>${lunar[0]}/${lunar[1]}/${lunar[2]}</strong> Âm lịch` +
      `${lunar[3] ? " (tháng nhuận)" : ""}.<br>` +
      `Can Chi: ${canChiDay(d, m, y)} • Tháng ${canChiMonth(lunar[1], lunar[2])} • Năm ${canChiYear(lunar[2])}.`;
  }

  function convertLunarClick() {
    const d = Number($("lunarDay").value);
    const m = Number($("lunarMonth").value);
    const y = Number($("lunarYear").value);
    const leap = $("lunarLeap").checked ? 1 : 0;

    if (
      !Number.isInteger(d) ||
      !Number.isInteger(m) ||
      !Number.isInteger(y) ||
      d < 1 ||
      d > 30 ||
      m < 1 ||
      m > 12 ||
      y < MIN_YEAR ||
      y > MAX_YEAR
    ) {
      $("lunarResult").textContent = "Ngày Âm lịch không hợp lệ.";
      return;
    }

    const solar = convertLunar2Solar(d, m, y, leap);
    if (solar[0] === 0) {
      $("lunarResult").textContent =
        "Ngày Âm lịch này không tồn tại hoặc lựa chọn tháng nhuận không đúng.";
      return;
    }

    const check = convertSolar2Lunar(solar[0], solar[1], solar[2]);
    if (check[0] !== d || check[1] !== m || check[2] !== y || !!check[3] !== !!leap) {
      $("lunarResult").textContent =
        "Ngày Âm lịch này không tồn tại hoặc lựa chọn tháng nhuận không đúng.";
      return;
    }

    $("lunarResult").innerHTML =
      `<strong>${pad(d)}/${pad(m)}/${y}${leap ? " (nhuận)" : ""}</strong> Âm lịch = ` +
      `<strong>${pad(solar[0])}/${pad(solar[1])}/${solar[2]}</strong> Dương lịch.<br>` +
      `Can Chi: ${canChiDay(solar[0], solar[1], solar[2])} • Tháng ${canChiMonth(m, y)} • Năm ${canChiYear(y)}.`;
  }

  // ===================== KHỞI TẠO SỰ KIỆN =====================
  document.addEventListener("DOMContentLoaded", () => {
    $("prevYear").addEventListener("click", () => {
      const y = current.getFullYear();
      if (y <= MIN_YEAR) return;
      current = makeCalendarDate(y - 1, current.getMonth() + 1, 1);
      renderCalendar();
    });

    $("prevMonth").addEventListener("click", () => {
      const y = current.getFullYear();
      const m = current.getMonth() + 1;
      if (y === MIN_YEAR && m === 1) return;
      current = makeCalendarDate(y, m - 1, 1);
      renderCalendar();
    });

    $("nextMonth").addEventListener("click", () => {
      const y = current.getFullYear();
      const m = current.getMonth() + 1;
      if (y === MAX_YEAR && m === 12) return;
      current = makeCalendarDate(y, m + 1, 1);
      renderCalendar();
    });

    $("nextYear").addEventListener("click", () => {
      const y = current.getFullYear();
      if (y >= MAX_YEAR) return;
      current = makeCalendarDate(y + 1, current.getMonth() + 1, 1);
      renderCalendar();
    });

    // Event delegation cho toàn bộ bảng lịch
    const tbody = $("calendarGrid");
    tbody.addEventListener("click", (event) => {
      const td = event.target.closest("td.day[data-date]");
      if (td) handleDayCellSelect(td);
    });
    tbody.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const td = event.target.closest("td.day[data-date]");
      if (!td) return;
      event.preventDefault();
      handleDayCellSelect(td);
    });

    $("todayBtn").addEventListener("click", resetToToday);
    $("searchDateBtn").addEventListener("click", searchDateClick);
    $("brainBtn").addEventListener("click", showHolidaysModal);
    $("closeHolidaysModal").addEventListener("click", closeHolidaysModal);
    $("holidaysModalBackdrop").addEventListener("click", closeHolidaysModal);
    $("closeSelectedDay").addEventListener("click", closeDayModal);
    $("dayModalBackdrop").addEventListener("click", closeDayModal);

    // Một listener duy nhất cho phím Escape
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const holidaysModal = $("holidaysModal");
      if (holidaysModal && !holidaysModal.hidden) {
        closeHolidaysModal();
        return;
      }
      const dayModal = $("selectedDayModal");
      if (dayModal && !dayModal.hidden) {
        closeDayModal();
      }
    });

    ["searchDay", "searchMonth", "searchYear"].forEach((id) => {
      $(id).addEventListener("keydown", (event) => {
        if (event.key === "Enter") searchDateClick();
      });
    });

    $("convertSolarBtn").addEventListener("click", convertSolarClick);
    $("convertLunarBtn").addEventListener("click", convertLunarClick);

    ["solarDay", "solarMonth", "solarYear"].forEach((id) => {
      $(id).addEventListener("keydown", (event) => {
        if (event.key === "Enter") convertSolarClick();
      });
    });

    ["lunarDay", "lunarMonth", "lunarYear"].forEach((id) => {
      $(id).addEventListener("keydown", (event) => {
        if (event.key === "Enter") convertLunarClick();
      });
    });

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        $(tab.dataset.tab).classList.add("active");
      });
    });

    loadHolidayData();
    setDefaultConverterValues();
    $("footerYear").textContent = vietnamToday.year;
    resetToToday();
  });

  window.AmLich = { convertSolar2Lunar, convertLunar2Solar, jdFromDate, jdToDate };
})();
