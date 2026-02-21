/**
 * Islamic Prayer Times Calculator
 * Pure-JavaScript astronomical calculation — no external API needed.
 *
 * Calculates: Sehri, Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, Tahajjud
 * Supports: MWL, ISNA, Egyptian, Umm al-Qura, Karachi methods
 * Supports: Shafi'i and Hanafi Asr calculation
 */

const PrayerTimes = (() => {
    'use strict';

    // ── Calculation Methods ──
    const METHODS = {
        mwl: { name: 'Muslim World League', fajrAngle: 18, ishaAngle: 17, ishaMinutes: 0 },
        isna: { name: 'ISNA (North America)', fajrAngle: 15, ishaAngle: 15, ishaMinutes: 0 },
        egypt: { name: 'Egyptian General Authority', fajrAngle: 19.5, ishaAngle: 17.5, ishaMinutes: 0 },
        makkah: { name: 'Umm al-Qura (Makkah)', fajrAngle: 18.5, ishaAngle: 0, ishaMinutes: 90 },
        karachi: { name: 'University of Islamic Sciences, Karachi', fajrAngle: 18, ishaAngle: 18, ishaMinutes: 0 }
    };

    const ASR_SCHOOLS = {
        shafii: 1,  // shadow = object + 1x shadow length
        hanafi: 2   // shadow = object + 2x shadow length
    };

    // ── Helpers ──
    const DEG = Math.PI / 180;
    const RAD = 180 / Math.PI;

    function sin(d) { return Math.sin(d * DEG); }
    function cos(d) { return Math.cos(d * DEG); }
    function tan(d) { return Math.tan(d * DEG); }
    function arcsin(x) { return Math.asin(x) * RAD; }
    function arccos(x) { return Math.acos(x) * RAD; }
    function arctan2(y, x) { return Math.atan2(y, x) * RAD; }
    function fixHour(h) { return ((h % 24) + 24) % 24; }

    // ── Sun Position ──
    function julianDate(year, month, day) {
        if (month <= 2) { year--; month += 12; }
        const A = Math.floor(year / 100);
        const B = 2 - A + Math.floor(A / 4);
        return Math.floor(365.25 * (year + 4716)) +
            Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
    }

    function sunPosition(jd) {
        const D = jd - 2451545.0; // Days since J2000.0
        const g = fixAngle(357.529 + 0.98560028 * D); // Mean anomaly
        const q = fixAngle(280.459 + 0.98564736 * D); // Mean longitude
        const L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g)); // Ecliptic longitude
        const e = 23.439 - 0.00000036 * D; // Obliquity of ecliptic

        const RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
        const declination = arcsin(sin(e) * sin(L));
        const eqOfTime = q / 15 - fixHour(RA);

        return { declination, eqOfTime };
    }

    function fixAngle(a) { return ((a % 360) + 360) % 360; }

    // ── Core Calculations ──
    function midDay(eqOfTime, lng) {
        return fixHour(12 - eqOfTime);
    }

    function sunAngleTime(angle, latitude, declination, direction) {
        const noon = 12; // Will be adjusted later
        const a = -sin(angle) - sin(latitude) * sin(declination);
        const b = cos(latitude) * cos(declination);
        const ratio = a / b;

        if (ratio > 1 || ratio < -1) return NaN; // Sun never reaches this angle

        const hourAngle = arccos(ratio) / 15;
        return noon + (direction === 'ccw' ? -hourAngle : hourAngle);
    }

    function asrTime(factor, latitude, declination) {
        // Asr: shadow = factor * object length + noon shadow
        // Asr angle = acot(factor + tan(|latitude - declination|))
        const angle = Math.atan(1 / (factor + tan(Math.abs(latitude - declination)))) * (180 / Math.PI);
        // Compute hour angle for this elevation angle
        const cosH = (sin(angle) - sin(latitude) * sin(declination)) /
            (cos(latitude) * cos(declination));
        if (cosH > 1 || cosH < -1) return NaN;
        return arccos(cosH) / 15;
    }

    // ── Main Calculator ──
    function calculate(date, latitude, longitude, timezone, method = 'mwl', asrSchool = 'shafii') {
        const m = METHODS[method] || METHODS.mwl;
        const asrFactor = ASR_SCHOOLS[asrSchool] || 1;
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const jd = julianDate(year, month, day);

        const sunPos = sunPosition(jd);
        const decl = sunPos.declination;
        const eqt = sunPos.eqOfTime;

        // Dhuhr (solar noon)
        const dhuhr = midDay(eqt, longitude) + timezone - longitude / 15;

        // Fajr
        const fajr = dhuhr + sunAngleTime(m.fajrAngle, latitude, decl, 'ccw') - 12;

        // Sunrise (angle = 0.833° below horizon for atmospheric refraction)
        const sunrise = dhuhr + sunAngleTime(0.833, latitude, decl, 'ccw') - 12;

        // Asr (asrTime returns hour angle from noon)
        const asrHA = asrTime(asrFactor, latitude, decl);
        const asr = dhuhr + (isNaN(asrHA) ? NaN : asrHA);

        // Maghrib (same as sunset, 0.833° below horizon)
        const maghrib = dhuhr + sunAngleTime(0.833, latitude, decl, 'cw') - 12;

        // Isha
        let isha;
        if (m.ishaMinutes > 0) {
            // Umm al-Qura: fixed minutes after Maghrib
            isha = maghrib + m.ishaMinutes / 60;
        } else {
            isha = dhuhr + sunAngleTime(m.ishaAngle, latitude, decl, 'cw') - 12;
        }

        // Sehri (Suhoor end time) — 10 minutes before Fajr
        const sehri = fajr - 10 / 60;

        // Tahajjud — last third of the night
        // Night = Maghrib(previous day) to Fajr, but simplified as: Isha to Fajr
        // Tahajjud starts at 2/3 of the night from Maghrib
        const nightDuration = (fajr + 24 - maghrib) % 24;
        const tahajjud = maghrib + (nightDuration * 2 / 3);

        return {
            sehri: formatTime(sehri),
            fajr: formatTime(fajr),
            sunrise: formatTime(sunrise),
            dhuhr: formatTime(dhuhr),
            asr: formatTime(asr),
            maghrib: formatTime(maghrib),
            isha: formatTime(isha),
            tahajjud: formatTime(tahajjud),
            _raw: { sehri, fajr, sunrise, dhuhr, asr, maghrib, isha, tahajjud }
        };
    }

    // Calculate for a specific Gregorian date (y, m, d)
    function calculateForDate(year, month, day, latitude, longitude, timezone, method, asrSchool) {
        const d = new Date(year, month - 1, day);
        return calculate(d, latitude, longitude, timezone, method, asrSchool);
    }

    function formatTime(hours) {
        if (isNaN(hours)) return '--:--';
        hours = fixHour(hours);
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');

        // 12-hour format
        const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
        const ampm = h < 12 ? 'AM' : 'PM';
        return { h24: `${hh}:${mm}`, h12: `${h12}:${mm} ${ampm}`, decimal: hours };
    }

    function getNextPrayer(times, currentHours) {
        const order = ['sehri', 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
        const raw = times._raw;

        for (const name of order) {
            if (raw[name] > currentHours) {
                return { name, time: raw[name] };
            }
        }
        // After Isha → Tahajjud or next Sehri
        if (raw.tahajjud > currentHours) {
            return { name: 'tahajjud', time: raw.tahajjud };
        }
        return { name: 'sehri', time: raw.sehri + 24, tomorrow: true };
    }

    function formatCountdown(targetHours, currentHours) {
        let diff = targetHours - currentHours;
        if (diff < 0) diff += 24;
        const h = Math.floor(diff);
        const m = Math.floor((diff - h) * 60);
        const s = Math.floor(((diff - h) * 60 - m) * 60);
        return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    }

    // ── Prayer names in multiple languages ──
    const PRAYER_NAMES = {
        en: { sehri: 'Sehri', fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', tahajjud: 'Tahajjud' },
        ar: { sehri: 'السحور', fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء', tahajjud: 'التهجد' },
        bn: { sehri: 'সেহরি', fajr: 'ফজর', sunrise: 'সূর্যোদয়', dhuhr: 'যোহর', asr: 'আসর', maghrib: 'মাগরিব', isha: 'এশা', tahajjud: 'তাহাজ্জুদ' },
        ur: { sehri: 'سحری', fajr: 'فجر', sunrise: 'طلوع آفتاب', dhuhr: 'ظہر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشاء', tahajjud: 'تہجد' },
        tr: { sehri: 'Sahur', fajr: 'İmsak', sunrise: 'Güneş', dhuhr: 'Öğle', asr: 'İkindi', maghrib: 'Akşam', isha: 'Yatsı', tahajjud: 'Teheccüd' },
        ms: { sehri: 'Sahur', fajr: 'Subuh', sunrise: 'Syuruk', dhuhr: 'Zohor', asr: 'Asar', maghrib: 'Maghrib', isha: 'Isyak', tahajjud: 'Tahajjud' },
        id: { sehri: 'Sahur', fajr: 'Subuh', sunrise: 'Terbit', dhuhr: 'Dzuhur', asr: 'Ashar', maghrib: 'Maghrib', isha: 'Isya', tahajjud: 'Tahajud' },
        fr: { sehri: 'Suhoor', fajr: 'Fajr', sunrise: 'Lever', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', tahajjud: 'Tahajjud' }
    };

    // ── Prayer icons ──
    const PRAYER_ICONS = {
        sehri: '🍽️', fajr: '🌙', sunrise: '🌅', dhuhr: '☀️', asr: '🌤️', maghrib: '🌇', isha: '🌑', tahajjud: '🤲'
    };

    return {
        calculate,
        calculateForDate,
        getNextPrayer,
        formatCountdown,
        METHODS,
        ASR_SCHOOLS,
        PRAYER_NAMES,
        PRAYER_ICONS
    };
})();
