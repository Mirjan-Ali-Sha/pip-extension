/**
 * City Database for Prayer Times
 * ~50 major cities grouped by region with lat/lng/timezone/country.
 */

const CityDatabase = (() => {
    'use strict';

    const CITIES = [
        // ── Middle East ──
        { id: 'mecca', name: 'Mecca', country: 'Saudi Arabia', lat: 21.4225, lng: 39.8262, tz: 3, region: 'middle-east' },
        { id: 'medina', name: 'Medina', country: 'Saudi Arabia', lat: 24.4686, lng: 39.6142, tz: 3, region: 'middle-east' },
        { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, tz: 3, region: 'middle-east' },
        { id: 'jeddah', name: 'Jeddah', country: 'Saudi Arabia', lat: 21.5433, lng: 39.1728, tz: 3, region: 'middle-east' },
        { id: 'dubai', name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708, tz: 4, region: 'middle-east' },
        { id: 'abudhabi', name: 'Abu Dhabi', country: 'UAE', lat: 24.4539, lng: 54.3773, tz: 4, region: 'middle-east' },
        { id: 'doha', name: 'Doha', country: 'Qatar', lat: 25.2854, lng: 51.5310, tz: 3, region: 'middle-east' },
        { id: 'kuwait', name: 'Kuwait City', country: 'Kuwait', lat: 29.3759, lng: 47.9774, tz: 3, region: 'middle-east' },
        { id: 'muscat', name: 'Muscat', country: 'Oman', lat: 23.5880, lng: 58.3829, tz: 4, region: 'middle-east' },
        { id: 'manama', name: 'Manama', country: 'Bahrain', lat: 26.2285, lng: 50.5860, tz: 3, region: 'middle-east' },
        { id: 'jerusalem', name: 'Jerusalem', country: 'Palestine', lat: 31.7683, lng: 35.2137, tz: 2, region: 'middle-east' },
        { id: 'amman', name: 'Amman', country: 'Jordan', lat: 31.9454, lng: 35.9284, tz: 3, region: 'middle-east' },
        { id: 'beirut', name: 'Beirut', country: 'Lebanon', lat: 33.8938, lng: 35.5018, tz: 2, region: 'middle-east' },
        { id: 'baghdad', name: 'Baghdad', country: 'Iraq', lat: 33.3152, lng: 44.3661, tz: 3, region: 'middle-east' },
        { id: 'tehran', name: 'Tehran', country: 'Iran', lat: 35.6892, lng: 51.3890, tz: 3.5, region: 'middle-east' },
        { id: 'sanaa', name: "Sana'a", country: 'Yemen', lat: 15.3694, lng: 44.1910, tz: 3, region: 'middle-east' },

        // ── North Africa ──
        { id: 'cairo', name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357, tz: 2, region: 'africa' },
        { id: 'alexandria', name: 'Alexandria', country: 'Egypt', lat: 31.2001, lng: 29.9187, tz: 2, region: 'africa' },
        { id: 'tripoli', name: 'Tripoli', country: 'Libya', lat: 32.8872, lng: 13.1913, tz: 2, region: 'africa' },
        { id: 'tunis', name: 'Tunis', country: 'Tunisia', lat: 36.8065, lng: 10.1815, tz: 1, region: 'africa' },
        { id: 'algiers', name: 'Algiers', country: 'Algeria', lat: 36.7538, lng: 3.0588, tz: 1, region: 'africa' },
        { id: 'casablanca', name: 'Casablanca', country: 'Morocco', lat: 33.5731, lng: -7.5898, tz: 1, region: 'africa' },
        { id: 'khartoum', name: 'Khartoum', country: 'Sudan', lat: 15.5007, lng: 32.5599, tz: 2, region: 'africa' },
        { id: 'mogadishu', name: 'Mogadishu', country: 'Somalia', lat: 2.0469, lng: 45.3182, tz: 3, region: 'africa' },
        { id: 'lagos', name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792, tz: 1, region: 'africa' },

        // ── South & Central Asia ──
        { id: 'karachi', name: 'Karachi', country: 'Pakistan', lat: 24.8607, lng: 67.0011, tz: 5, region: 'south-asia' },
        { id: 'lahore', name: 'Lahore', country: 'Pakistan', lat: 31.5204, lng: 74.3587, tz: 5, region: 'south-asia' },
        { id: 'islamabad', name: 'Islamabad', country: 'Pakistan', lat: 33.6844, lng: 73.0479, tz: 5, region: 'south-asia' },
        { id: 'peshawar', name: 'Peshawar', country: 'Pakistan', lat: 34.0151, lng: 71.5249, tz: 5, region: 'south-asia' },
        { id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', lat: 23.8103, lng: 90.4125, tz: 6, region: 'south-asia' },
        { id: 'chittagong', name: 'Chittagong', country: 'Bangladesh', lat: 22.3569, lng: 91.7832, tz: 6, region: 'south-asia' },
        { id: 'delhi', name: 'New Delhi', country: 'India', lat: 28.6139, lng: 77.2090, tz: 5.5, region: 'south-asia' },
        { id: 'mumbai', name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777, tz: 5.5, region: 'south-asia' },
        { id: 'bengaluru', name: 'Bengaluru', country: 'India', lat: 12.9716, lng: 77.5946, tz: 5.5, region: 'south-asia' },
        { id: 'hyderabad', name: 'Hyderabad', country: 'India', lat: 17.3850, lng: 78.4867, tz: 5.5, region: 'south-asia' },
        { id: 'chennai', name: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707, tz: 5.5, region: 'south-asia' },
        { id: 'kolkata', name: 'Kolkata', country: 'India', lat: 22.5726, lng: 88.3639, tz: 5.5, region: 'south-asia' },
        { id: 'ahmedabad', name: 'Ahmedabad', country: 'India', lat: 23.0225, lng: 72.5714, tz: 5.5, region: 'south-asia' },
        { id: 'pune', name: 'Pune', country: 'India', lat: 18.5204, lng: 73.8567, tz: 5.5, region: 'south-asia' },
        { id: 'jaipur', name: 'Jaipur', country: 'India', lat: 26.9124, lng: 75.7873, tz: 5.5, region: 'south-asia' },
        { id: 'lucknow', name: 'Lucknow', country: 'India', lat: 26.8467, lng: 80.9462, tz: 5.5, region: 'south-asia' },
        { id: 'indore', name: 'Indore', country: 'India', lat: 22.7196, lng: 75.8577, tz: 5.5, region: 'south-asia' },
        { id: 'bhopal', name: 'Bhopal', country: 'India', lat: 23.2599, lng: 77.4126, tz: 5.5, region: 'south-asia' },
        { id: 'srinagar', name: 'Srinagar', country: 'India', lat: 34.0837, lng: 74.7973, tz: 5.5, region: 'south-asia' },
        { id: 'patna', name: 'Patna', country: 'India', lat: 25.6093, lng: 85.1376, tz: 5.5, region: 'south-asia' },
        { id: 'nagpur', name: 'Nagpur', country: 'India', lat: 21.1458, lng: 79.0882, tz: 5.5, region: 'south-asia' },
        { id: 'surat', name: 'Surat', country: 'India', lat: 21.1702, lng: 72.8311, tz: 5.5, region: 'south-asia' },
        { id: 'coimbatore', name: 'Coimbatore', country: 'India', lat: 11.0168, lng: 76.9558, tz: 5.5, region: 'south-asia' },
        { id: 'trivandrum', name: 'Thiruvananthapuram', country: 'India', lat: 8.5241, lng: 76.9366, tz: 5.5, region: 'south-asia' },
        { id: 'kochi', name: 'Kochi', country: 'India', lat: 9.9312, lng: 76.2673, tz: 5.5, region: 'south-asia' },
        { id: 'kabul', name: 'Kabul', country: 'Afghanistan', lat: 34.5553, lng: 69.2075, tz: 4.5, region: 'south-asia' },
        { id: 'colombo', name: 'Colombo', country: 'Sri Lanka', lat: 6.9271, lng: 79.8612, tz: 5.5, region: 'south-asia' },

        // ── Southeast Asia ──
        { id: 'jakarta', name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456, tz: 7, region: 'southeast-asia' },
        { id: 'kualalumpur', name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.1390, lng: 101.6869, tz: 8, region: 'southeast-asia' },
        { id: 'singapore', name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, tz: 8, region: 'southeast-asia' },
        { id: 'brunei', name: 'Bandar Seri B.', country: 'Brunei', lat: 4.9031, lng: 114.9398, tz: 8, region: 'southeast-asia' },

        // ── Turkey & Central Asia ──
        { id: 'istanbul', name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784, tz: 3, region: 'turkey-central' },
        { id: 'ankara', name: 'Ankara', country: 'Turkey', lat: 39.9334, lng: 32.8597, tz: 3, region: 'turkey-central' },
        { id: 'tashkent', name: 'Tashkent', country: 'Uzbekistan', lat: 41.2995, lng: 69.2401, tz: 5, region: 'turkey-central' },
        { id: 'baku', name: 'Baku', country: 'Azerbaijan', lat: 40.4093, lng: 49.8671, tz: 4, region: 'turkey-central' },

        // ── Europe & Americas ──
        { id: 'london', name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, tz: 0, region: 'europe-americas' },
        { id: 'paris', name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, tz: 1, region: 'europe-americas' },
        { id: 'berlin', name: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050, tz: 1, region: 'europe-americas' },
        { id: 'newyork', name: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060, tz: -5, region: 'europe-americas' },
        { id: 'toronto', name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832, tz: -5, region: 'europe-americas' },
        { id: 'chicago', name: 'Chicago', country: 'USA', lat: 41.8781, lng: -87.6298, tz: -6, region: 'europe-americas' },
        { id: 'losangeles', name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437, tz: -8, region: 'europe-americas' },
        { id: 'sydney', name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, tz: 11, region: 'europe-americas' }
    ];

    const REGIONS = {
        'middle-east': { en: 'Middle East', ar: 'الشرق الأوسط' },
        'africa': { en: 'Africa', ar: 'أفريقيا' },
        'south-asia': { en: 'South Asia', ar: 'جنوب آسيا' },
        'southeast-asia': { en: 'Southeast Asia', ar: 'جنوب شرق آسيا' },
        'turkey-central': { en: 'Turkey & Central', ar: 'تركيا ووسط آسيا' },
        'europe-americas': { en: 'Europe & Americas', ar: 'أوروبا والأمريكتين' }
    };

    function findNearest(lat, lng) {
        let minDist = Infinity;
        let nearest = CITIES[0];
        for (const city of CITIES) {
            const dLat = city.lat - lat;
            const dLng = city.lng - lng;
            const dist = dLat * dLat + dLng * dLng;
            if (dist < minDist) {
                minDist = dist;
                nearest = city;
            }
        }
        return nearest;
    }

    function search(query) {
        const q = query.toLowerCase().trim();
        if (!q) return CITIES;
        return CITIES.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.country.toLowerCase().includes(q) ||
            c.id.includes(q)
        );
    }

    function getById(id) {
        return CITIES.find(c => c.id === id) || CITIES[0];
    }

    function getGroupedByRegion() {
        const grouped = {};
        for (const city of CITIES) {
            if (!grouped[city.region]) grouped[city.region] = [];
            grouped[city.region].push(city);
        }
        return grouped;
    }

    return { CITIES, REGIONS, findNearest, search, getById, getGroupedByRegion };
})();
