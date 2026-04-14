export interface LocationData {
  state: string;
  cities: string[];
}

export const INDIAN_LOCATIONS: LocationData[] = [
  {
    state: 'Tamil Nadu',
    cities: [
      'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
      'Tirunelveli', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi',
      'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi', 'Karur',
      'Udhagamandalam', 'Hosur', 'Nagercoil', 'Kanchipuram', 'Kumbakonam',
      'Rajapalayam', 'Puducherry', 'Ambur', 'Tiruvannamalai', 'Pollachi',
    ],
  },
  { state: 'Karnataka', cities: ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru', 'Belgaum'] },
  { state: 'Kerala', cities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'] },
  { state: 'Andhra Pradesh', cities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kurnool'] },
  { state: 'Telangana', cities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar'] },
  { state: 'Maharashtra', cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'] },
  { state: 'Delhi', cities: ['New Delhi', 'Delhi'] },
  { state: 'Gujarat', cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'] },
  { state: 'Rajasthan', cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Ajmer', 'Kota'] },
  { state: 'Uttar Pradesh', cities: ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Noida'] },
  { state: 'West Bengal', cities: ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol'] },
  { state: 'Madhya Pradesh', cities: ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'] },
  { state: 'Punjab', cities: ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'] },
  { state: 'Bihar', cities: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga'] },
  { state: 'Odisha', cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri', 'Sambalpur'] },
  { state: 'Assam', cities: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon'] },
  { state: 'Jharkhand', cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar'] },
  { state: 'Goa', cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'] },
];
