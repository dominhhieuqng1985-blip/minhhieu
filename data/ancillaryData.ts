import { AncillaryOption } from '../types';

// Updated Pricing: December 2025 Standard (+50,000 VND per package)
export const MOCK_BAGGAGE_OPTIONS: Record<string, AncillaryOption[]> = {
  'vietjet air': [
    { id: 'vj_bag_20', name: 'Gói 20kg', price: 280000, description: 'Hành lý ký gửi tiêu chuẩn' },
    { id: 'vj_bag_30', name: 'Gói 30kg', price: 430000, description: 'Hành lý ký gửi cỡ lớn' },
    { id: 'vj_bag_40', name: 'Gói 40kg', price: 570000, description: 'Tối đa 2 kiện' },
    { id: 'vj_bag_50', name: 'Gói 50kg', price: 730000, description: 'Dành cho hành khách mang nhiều đồ' },
  ],
  'vietnam airlines': [
    { id: 'vn_bag_23', name: 'Thêm 1 kiện 23kg', price: 530000, description: 'Hệ kiện tiêu chuẩn VNA' },
    { id: 'vn_bag_10', name: 'Gói 10kg (Prepaid)', price: 300000, description: 'Gói nhỏ tiết kiệm' },
  ],
  'bamboo airways': [
    { id: 'qh_bag_20', name: 'Gói 20kg', price: 290000, description: 'Tiết kiệm hơn mua tại sân bay' },
    { id: 'qh_bag_25', name: 'Gói 25kg', price: 340000, description: 'Phổ biến nhất' },
    { id: 'qh_bag_30', name: 'Gói 30kg', price: 410000, description: 'Thoải mái mua sắm' },
    { id: 'qh_bag_40', name: 'Gói 40kg', price: 540000, description: 'Dành cho chuyến đi dài' },
  ],
  'vietravel airlines': [
      { id: 'vu_bag_20', name: 'Gói 20kg', price: 270000, description: 'Hành lý ký gửi' },
      { id: 'vu_bag_30', name: 'Gói 30kg', price: 400000, description: 'Hành lý ký gửi' },
  ],
  'default': [
    { id: 'def_bag_20', name: 'Gói 20kg', price: 300000, description: 'Áp dụng cho 1 khách / 1 chiều' },
    { id: 'def_bag_30', name: 'Gói 30kg', price: 430000, description: 'Áp dụng cho 1 khách / 1 chiều' },
  ]
};

export const getBaggageOptionsForAirline = (airlineName: string, isInternational: boolean = false): AncillaryOption[] => {
    // International flights: Return empty array to trigger specific UI message
    if (isInternational) {
        return [];
    }

    const airlineLower = airlineName.toLowerCase();
    if (airlineLower.includes('vietjet')) return MOCK_BAGGAGE_OPTIONS['vietjet air'];
    if (airlineLower.includes('vietnam airlines')) return MOCK_BAGGAGE_OPTIONS['vietnam airlines'];
    if (airlineLower.includes('bamboo')) return MOCK_BAGGAGE_OPTIONS['bamboo airways'];
    if (airlineLower.includes('vietravel')) return MOCK_BAGGAGE_OPTIONS['vietravel airlines'];
    return MOCK_BAGGAGE_OPTIONS['default'];
};