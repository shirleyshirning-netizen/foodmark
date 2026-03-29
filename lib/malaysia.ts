export const MALAYSIA_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Kuala Lumpur',
  'Labuan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Penang',
  'Perak',
  'Perlis',
  'Putrajaya',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
]

const STATE_CITY_MAP: Record<string, string[]> = {
  'Kuala Lumpur': [
    'Kuala Lumpur', 'KL', 'Chow Kit', 'Bangsar', 'Mont Kiara', 'KLCC',
    'Bukit Bintang', 'Damansara', 'Kepong', 'Setapak', 'Wangsa Maju',
    'Titiwangsa', 'Brickfields', 'Cheras', 'Ampang', 'Sri Petaling',
    'Segambut', 'Sentul', 'Desa Park City', 'Taman Tun', 'TTDI',
    'Pandan Indah', 'Taman Permata', 'Keramat', 'Maluri',
  ],
  'Selangor': [
    'Petaling Jaya', 'PJ', 'Shah Alam', 'Subang', 'Subang Jaya',
    'Klang', 'Rawang', 'Kajang', 'Semenyih', 'Puchong', 'Serdang',
    'Sepang', 'Cyberjaya', 'Putrajaya', 'Gombak', 'Batu Caves',
    'Ampang', 'Cheras', 'Balakong', 'Seri Kembangan', 'Bangi',
    'Nilai', 'Bukit Raja', 'Kota Kemuning', 'Setia Alam', 'Alam Impian',
    'Sunway', 'USJ', 'SS', 'Damansara Utama', 'Ara Damansara',
    'Kelana Jaya', 'Kapar', 'Meru', 'Port Klang', 'Pulau Indah',
  ],
  'Penang': [
    'Georgetown', 'George Town', 'Penang', 'Butterworth', 'Bukit Mertajam',
    'Seberang Prai', 'Bayan Lepas', 'Batu Ferringhi', 'Tanjung Tokong',
    'Gurney', 'Jelutong', 'Air Itam', 'Paya Terubong', 'Gelugor',
    'Sungai Nibong', 'Relau', 'Balik Pulau', 'Teluk Bahang', 'Kepala Batas',
  ],
  'Johor': [
    'Johor Bahru', 'JB', 'Iskandar Puteri', 'Kulai', 'Skudai',
    'Kluang', 'Batu Pahat', 'Muar', 'Segamat', 'Kota Tinggi',
    'Mersing', 'Pontian', 'Johor', 'Masai', 'Pasir Gudang',
    'Ulu Tiram', 'Senai', 'Nusajaya', 'Horizon Hills', 'Gelang Patah',
  ],
  'Perak': [
    'Ipoh', 'Taiping', 'Teluk Intan', 'Lumut', 'Manjung', 'Sitiawan',
    'Bagan Datuk', 'Kuala Kangsar', 'Sungai Siput', 'Jelapang',
    'Falim', 'Meru', 'Chemor', 'Ulu Kinta', 'Batu Gajah',
    'Gopeng', 'Bidor', 'Tapah',
  ],
  'Kedah': [
    'Alor Setar', 'Kulim', 'Sungai Petani', 'Langkawi', 'Kubang Pasu',
    'Kota Setar', 'Baling', 'Pendang', 'Kuala Muda', 'Padang Terap',
    'Pokok Sena', 'Bandar Baharu',
  ],
  'Kelantan': [
    'Kota Bharu', 'Kuala Krai', 'Machang', 'Pasir Mas', 'Tanah Merah',
    'Bachok', 'Gua Musang', 'Kuala Kerai', 'Jeli', 'Tumpat',
    'Pasir Puteh',
  ],
  'Terengganu': [
    'Kuala Terengganu', 'Dungun', 'Kemaman', 'Marang', 'Setiu',
    'Hulu Terengganu', 'Besut', 'Kerteh',
  ],
  'Pahang': [
    'Kuantan', 'Temerloh', 'Bentong', 'Raub', 'Jerantut',
    'Cameron Highlands', 'Genting Highlands', 'Fraser Hill', 'Rompin',
    'Pekan', 'Maran', 'Bera', 'Lipis',
  ],
  'Negeri Sembilan': [
    'Seremban', 'Port Dickson', 'Nilai', 'Rembau', 'Tampin',
    'Jempol', 'Jelebu', 'Kuala Pilah',
  ],
  'Melaka': [
    'Melaka', 'Malacca', 'Alor Gajah', 'Jasin', 'Ayer Keroh',
    'Bukit Katil', 'Klebang', 'Bachang',
  ],
  'Sabah': [
    'Kota Kinabalu', 'KK', 'Sandakan', 'Tawau', 'Lahad Datu',
    'Keningau', 'Semporna', 'Kudat', 'Ranau', 'Beaufort',
    'Papar', 'Penampang', 'Donggongon',
  ],
  'Sarawak': [
    'Kuching', 'Miri', 'Sibu', 'Bintulu', 'Limbang', 'Sarikei',
    'Sri Aman', 'Kapit', 'Mukah', 'Betong', 'Samarahan',
  ],
  'Putrajaya': ['Putrajaya'],
  'Labuan': ['Labuan', 'Victoria'],
  'Perlis': ['Kangar', 'Perlis', 'Arau', 'Padang Besar'],
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function wordMatch(text: string, word: string): boolean {
  return new RegExp(`\\b${escapeRegex(word)}\\b`, 'i').test(text)
}

// Each entry maps a keyword that may appear in an address to its canonical state name.
// Longer / more specific keywords first to prevent partial matches.
// Includes English aliases (e.g. "Malacca" → "Melaka", "Penang" / "Pulau Pinang").
const STATES_BY_SPECIFICITY: Array<{ keyword: string; state: string }> = [
  { keyword: 'Negeri Sembilan', state: 'Negeri Sembilan' },
  { keyword: 'Kuala Lumpur',    state: 'Kuala Lumpur'    },
  { keyword: 'Terengganu',      state: 'Terengganu'      },
  { keyword: 'Kelantan',        state: 'Kelantan'        },
  { keyword: 'Putrajaya',       state: 'Putrajaya'       },
  { keyword: 'Selangor',        state: 'Selangor'        },
  { keyword: 'Sarawak',         state: 'Sarawak'         },
  { keyword: 'Pulau Pinang',    state: 'Penang'          }, // Malay official name
  { keyword: 'Penang',          state: 'Penang'          },
  { keyword: 'Pahang',          state: 'Pahang'          },
  { keyword: 'Malacca',         state: 'Melaka'          }, // English alias
  { keyword: 'Melaka',          state: 'Melaka'          },
  { keyword: 'Labuan',          state: 'Labuan'          },
  { keyword: 'Johor',           state: 'Johor'           },
  { keyword: 'Kedah',           state: 'Kedah'           },
  { keyword: 'Sabah',           state: 'Sabah'           },
  { keyword: 'Perak',           state: 'Perak'           },
  { keyword: 'Perlis',          state: 'Perlis'          },
]

export function detectStateAndCity(address: string): { state: string; city: string } {
  // Step 1: Find the state name in the address first (most reliable signal)
  let matchedState: string | null = null
  for (const { keyword, state } of STATES_BY_SPECIFICITY) {
    if (wordMatch(address, keyword)) {
      matchedState = state
      break
    }
  }

  if (matchedState) {
    // Step 2: Within that state, find the most specific city using word boundaries
    const cities = STATE_CITY_MAP[matchedState] || []
    for (const city of cities) {
      if (wordMatch(address, city)) {
        return { state: matchedState, city }
      }
    }
    return { state: matchedState, city: matchedState }
  }

  // Step 3: No state name found — fall back to city matching with word boundaries
  // Skip abbreviations shorter than 3 chars to avoid false positives
  for (const [state, cities] of Object.entries(STATE_CITY_MAP)) {
    for (const city of cities) {
      if (city.length < 3) continue
      if (wordMatch(address, city)) {
        return { state, city }
      }
    }
  }

  return { state: 'Malaysia', city: 'Unknown' }
}

export const STATE_COLORS: Record<string, string> = {
  'Kuala Lumpur': 'bg-red-500',
  'Selangor': 'bg-blue-500',
  'Penang': 'bg-orange-500',
  'Johor': 'bg-yellow-500',
  'Perak': 'bg-green-500',
  'Kedah': 'bg-purple-500',
  'Kelantan': 'bg-pink-500',
  'Terengganu': 'bg-teal-500',
  'Pahang': 'bg-indigo-500',
  'Negeri Sembilan': 'bg-cyan-500',
  'Melaka': 'bg-rose-500',
  'Sabah': 'bg-amber-500',
  'Sarawak': 'bg-lime-500',
  'Putrajaya': 'bg-violet-500',
  'Labuan': 'bg-sky-500',
  'Perlis': 'bg-emerald-500',
  'Malaysia': 'bg-gray-500',
}
