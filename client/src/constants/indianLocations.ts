export interface StateLocation {
  state: string;
  cities: string[];
}

export const INDIAN_LOCATIONS: StateLocation[] = [
  {
    state: 'Maharashtra',
    cities: [
      'Mumbai',
      'Pune',
      'Nagpur',
      'Nashik',
      'Thane',
      'Aurangabad (Chhatrapati Sambhaji Nagar)',
      'Navi Mumbai',
      'Solapur',
      'Kolhapur',
      'Amravati',
    ],
  },
  {
    state: 'Delhi',
    cities: [
      'New Delhi',
      'North Delhi',
      'South Delhi',
      'West Delhi',
      'East Delhi',
      'Central Delhi',
    ],
  },
  {
    state: 'Karnataka',
    cities: [
      'Bengaluru',
      'Mysuru',
      'Hubballi-Dharwad',
      'Mangaluru',
      'Belagavi',
      'Kalaburagi',
      'Davangere',
      'Ballari',
    ],
  },
  {
    state: 'Tamil Nadu',
    cities: [
      'Chennai',
      'Coimbatore',
      'Madurai',
      'Tiruchirappalli',
      'Salem',
      'Tirunelveli',
      'Erode',
      'Vellore',
    ],
  },
  {
    state: 'Gujarat',
    cities: [
      'Ahmedabad',
      'Surat',
      'Vadodara',
      'Rajkot',
      'Bhavnagar',
      'Jamnagar',
      'Gandhinagar',
      'Junagadh',
    ],
  },
  {
    state: 'Telangana',
    cities: [
      'Hyderabad',
      'Warangal',
      'Nizamabad',
      'Karimnagar',
      'Ramagundam',
      'Khammam',
    ],
  },
  {
    state: 'Uttar Pradesh',
    cities: [
      'Lucknow',
      'Kanpur',
      'Noida',
      'Greater Noida',
      'Ghaziabad',
      'Agra',
      'Varanasi',
      'Prayagraj',
      'Meerut',
    ],
  },
  {
    state: 'West Bengal',
    cities: [
      'Kolkata',
      'Howrah',
      'Durgapur',
      'Asansol',
      'Siliguri',
      'Bardhaman',
    ],
  },
  {
    state: 'Rajasthan',
    cities: [
      'Jaipur',
      'Jodhpur',
      'Kota',
      'Bikaner',
      'Ajmer',
      'Udaipur',
      'Bhilwara',
    ],
  },
  {
    state: 'Madhya Pradesh',
    cities: [
      'Indore',
      'Bhopal',
      'Jabalpur',
      'Gwalior',
      'Ujjain',
      'Sagar',
    ],
  },
  {
    state: 'Kerala',
    cities: [
      'Kochi',
      'Thiruvananthapuram',
      'Kozhikode',
      'Thrissur',
      'Kollam',
      'Palakkad',
    ],
  },
  {
    state: 'Punjab',
    cities: [
      'Ludhiana',
      'Amritsar',
      'Jalandhar',
      'Patiala',
      'Bathinda',
      'Mohali',
    ],
  },
  {
    state: 'Haryana',
    cities: [
      'Gurugram',
      'Faridabad',
      'Panipat',
      'Ambala',
      'Yamunanagar',
      'Rohtak',
      'Hisar',
      'Karnal',
    ],
  },
  {
    state: 'Andhra Pradesh',
    cities: [
      'Visakhapatnam',
      'Vijayawada',
      'Guntur',
      'Nellore',
      'Kurnool',
      'Tirupati',
    ],
  },
];

export const INDIAN_STATES = INDIAN_LOCATIONS.map((loc) => loc.state);

export function getCitiesByState(stateName: string): string[] {
  const match = INDIAN_LOCATIONS.find((loc) => loc.state.toLowerCase() === stateName.toLowerCase());
  return match ? match.cities : [];
}
