/**
 * Hijri (Islamic) Calendar Conversion Engine
 * Uses the Tabular Islamic Calendar (arithmetic approximation)
 * Based on the civil/tabular algorithm with intercalary year pattern.
 */

const HijriEngine = (() => {
    // Hijri month names in multiple languages
    const MONTH_NAMES = {
        en: [
            'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
            'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
            'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijjah'
        ],
        ar: [
            'مُحَرَّم', 'صَفَر', 'رَبِيع الأَوَّل', 'رَبِيع الثَانِي',
            'جُمَادَى الأُولَى', 'جُمَادَى الآخِرَة', 'رَجَب', 'شَعْبَان',
            'رَمَضَان', 'شَوَّال', 'ذُو القَعْدَة', 'ذُو الحِجَّة'
        ],
        bn: [
            'মুহাররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি',
            'জমাদিউল আউয়াল', 'জমাদিউস সানি', 'রজব', 'শাবান',
            'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ'
        ],
        ur: [
            'محرم', 'صفر', 'ربیع الاول', 'ربیع الثانی',
            'جمادی الاول', 'جمادی الثانی', 'رجب', 'شعبان',
            'رمضان', 'شوال', 'ذوالقعدہ', 'ذوالحجہ'
        ],
        tr: [
            'Muharrem', 'Safer', 'Rebiülevvel', 'Rebiülahir',
            'Cemaziyelevvel', 'Cemaziyelahir', 'Recep', 'Şaban',
            'Ramazan', 'Şevval', 'Zilkade', 'Zilhicce'
        ],
        ms: [
            'Muharam', 'Safar', 'Rabiulawal', 'Rabiulakhir',
            'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban',
            'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'
        ],
        id: [
            'Muharam', 'Safar', 'Rabiul Awal', 'Rabiul Akhir',
            'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syakban',
            'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah'
        ],
        fr: [
            'Mouharram', 'Safar', 'Rabia al-Awal', 'Rabia ath-Thani',
            'Joumada al-Oula', 'Joumada ath-Thania', 'Rajab', 'Chaabane',
            'Ramadan', 'Chawwal', 'Dhou al-Qi\'da', 'Dhou al-Hijja'
        ],
        hi: [
            'मुहर्रम', 'सफ़र', 'रबी उल-अव्वल', 'रबी उल-थानी',
            'जमादी उल-अव्वल', 'जमादी उल-थानी', 'रजब', 'शाबान',
            'रमज़ान', 'शव्वाल', 'धुल-क़ादा', 'धुल-हिज्जा'
        ],
        te: [
            'ముహర్రం', 'సఫర్', 'రబీ అల్-అవ్వల', 'రబీ అల్-థానీ',
            'జమాది అల్-అవ్వల', 'జమాది అల్-థానీ', 'రజబ్', 'షాబాన్',
            'రమజాన్', 'షవ్వాల్', 'ధూల్ ఖైదా', 'ధూల్ హిజ్జా'
        ],
        ta: [
            'முஹர்ரம்', 'ஸஃபர்', 'ரபி அல்-அவ்வல்', 'ரபி அல்-தானி',
            'ஜமாதுல் அவ்வல்', 'ஜமாதுல் தானி', 'ரஜப்', 'ஷஃபான்',
            'ரம்ஜான்', 'ஷவ்வால்', 'துல் கஃதா', 'துல் ஹஜ்'
        ],
        ml: [
            'മുഹറം', 'സഫർ', 'റബീഉൽ അവ്വൽ', 'റബീഉൽ ആഖിർ',
            'ജമാദുൽ അവ്വൽ', 'ജമാദുൽ ആഖിർ', 'റജബ്', 'ശഅ്ബാൻ',
            'റമദാൻ', 'ശവ്വാൽ', 'ദുൽ ഖഅ്ദ', 'ദുൽ ഹിജ്ജ'
        ]
    };

    const DAY_NAMES = {
        en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        ar: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
        bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'],
        ur: ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'],
        tr: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
        ms: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
        id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
        fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
        hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
        te: ['ఆది', 'సోమ', 'మంగళ', 'బుధ', 'గురు', 'శుక్ర', 'శని'],
        ta: ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'],
        ml: ['ഞായർ', 'തിങ്കൾ', 'ചൊവ്വ', 'ബുധൻ', 'വ്യാഴം', 'വെള്ളി', 'ശനി']
    };

    const GREG_MONTH_NAMES = {
        en: ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'],
        ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
        bn: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
            'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
        ur: ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
            'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'],
        tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
        ms: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
            'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
        id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
        fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
        hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
            'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
        te: ['జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్',
            'జూలై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్'],
        ta: ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்',
            'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'],
        ml: ['ജനുവരി', 'ഫെബ്രുവരി', 'മാർച്ച്', 'ഏപ്രിൽ', 'മെയ്', 'ജൂൺ',
            'ജൂലൈ', 'ഓഗസ്റ്റ്', 'സെപ്റ്റംബർ', 'ഒക്ടോബർ', 'നവംബർ', 'ഡിസംബർ']
    };

    // Adjustment for Hijri date (days to add/subtract)
    let adjustment = 0;

    // Intercalary years in a 30-year cycle (civil tabular calendar)
    const INTERCALARY = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];

    function isHijriLeapYear(year) {
        return INTERCALARY.indexOf(((year - 1) % 30) + 1) !== -1;
    }

    function hijriMonthLength(year, month) {
        // Odd months = 30 days, even months = 29 days
        // Exception: month 12 in a leap year = 30 days
        if (month < 1 || month > 12) return 0;
        if (month % 2 === 1) return 30;
        if (month === 12 && isHijriLeapYear(year)) return 30;
        return 29;
    }

    function hijriYearLength(year) {
        return isHijriLeapYear(year) ? 355 : 354;
    }

    // ── Hijri ↔ JD (Kuwaiti/civil tabular algorithm) ──
    // Self-consistent pair using integer JD arithmetic.
    // Reference: https://en.wikipedia.org/wiki/Tabular_Islamic_calendar

    function hijriToJD(year, month, day) {
        return Math.floor((11 * year + 3) / 30) +
            354 * year +
            30 * month -
            Math.floor((month - 1) / 2) +
            day + 1948440 - 385;
    }

    function jdToHijri(jd) {
        const jdn = Math.floor(jd) + 1;
        const L = jdn - 1948440 + 10632;
        const N = Math.floor((L - 1) / 10631);
        let L2 = L - 10631 * N + 354;
        const J = (Math.floor((10985 - L2) / 5316)) *
            (Math.floor((50 * L2) / 17719)) +
            (Math.floor(L2 / 5670)) *
            (Math.floor((43 * L2) / 15238));
        L2 = L2 -
            (Math.floor((30 - J) / 15)) * (Math.floor((17719 * J) / 50)) -
            (Math.floor(J / 16)) * (Math.floor((15238 * J) / 43)) +
            29;
        const month = Math.floor((24 * L2) / 709);
        const day = L2 - Math.floor((709 * month) / 24);
        const year = 30 * N + J - 30;
        return { year, month, day: Math.floor(day) };
    }

    // ── Gregorian ↔ JD ──
    function gregorianToJD(year, month, day) {
        if (month <= 2) {
            year -= 1;
            month += 12;
        }
        const A = Math.floor(year / 100);
        const B = 2 - A + Math.floor(A / 4);
        return Math.floor(365.25 * (year + 4716)) +
            Math.floor(30.6001 * (month + 1)) +
            day + B - 1524.5;
    }

    function jdToGregorian(jd) {
        jd = jd + 0.5;
        const Z = Math.floor(jd);
        const A = (Z < 2299161) ? Z :
            Z + 1 + Math.floor((Z - 1867216.25) / 36524.25) -
            Math.floor(Math.floor((Z - 1867216.25) / 36524.25) / 4);
        const B = A + 1524;
        const C = Math.floor((B - 122.1) / 365.25);
        const D = Math.floor(365.25 * C);
        const E = Math.floor((B - D) / 30.6001);

        const day = B - D - Math.floor(30.6001 * E);
        const month = E < 14 ? E - 1 : E - 13;
        const year = month > 2 ? C - 4716 : C - 4715;

        return { year, month, day };
    }

    // ── High-level conversion helpers ──
    function gregorianToHijri(gYear, gMonth, gDay) {
        let jd = gregorianToJD(gYear, gMonth, gDay);
        jd += adjustment; // Apply adjustment
        return jdToHijri(jd);
    }

    function hijriToGregorian(hYear, hMonth, hDay) {
        let jd = hijriToJD(hYear, hMonth, hDay);
        jd -= adjustment; // Reverse adjustment
        return jdToGregorian(jd);
    }

    function getMonthName(month, lang = 'en') {
        const names = MONTH_NAMES[lang] || MONTH_NAMES.en;
        return names[month - 1] || '';
    }

    function getDayNames(lang = 'en') {
        return DAY_NAMES[lang] || DAY_NAMES.en;
    }

    function getGregMonthName(month, lang = 'en') {
        const names = GREG_MONTH_NAMES[lang] || GREG_MONTH_NAMES.en;
        return names[month - 1] || '';
    }

    function getDayOfWeek(hYear, hMonth, hDay) {
        let jd = hijriToJD(hYear, hMonth, hDay);
        jd -= adjustment; // Reverse adjustment
        return Math.floor(jd + 1.5) % 7; // 0=Sun, 1=Mon, ..., 6=Sat
    }

    function getToday() {
        const now = new Date();
        return gregorianToHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    function setAdjustment(adj) {
        adjustment = parseInt(adj) || 0;
    }

    return {
        setAdjustment,
        gregorianToHijri,
        hijriToGregorian,
        hijriMonthLength,
        hijriYearLength,
        isHijriLeapYear,
        getMonthName,
        getDayNames,
        getGregMonthName,
        getDayOfWeek,
        getToday,
        MONTH_NAMES,
        DAY_NAMES,
        GREG_MONTH_NAMES
    };
})();
