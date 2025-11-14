export interface Governorate {
  id: string;
  name: string;
  nameAr: string;
  cities: City[];
}

export interface City {
  id: string;
  name: string;
  nameAr: string;
}

export const egyptianGovernorates: Governorate[] = [
  {
    id: 'cairo',
    name: 'Cairo',
    nameAr: 'القاهرة',
    cities: [
      { id: 'cairo-city', name: 'Cairo City', nameAr: 'مدينة القاهرة' },
      { id: 'helwan', name: 'Helwan', nameAr: 'حلوان' },
      { id: 'maadi', name: 'Maadi', nameAr: 'المعادي' },
      { id: 'nasr-city', name: 'Nasr City', nameAr: 'مدينة نصر' },
      { id: 'new-cairo', name: 'New Cairo', nameAr: 'القاهرة الجديدة' },
      { id: 'zamalek', name: 'Zamalek', nameAr: 'الزمالك' },
      { id: 'downtown', name: 'Downtown', nameAr: 'وسط البلد' },
      { id: 'shubra', name: 'Shubra', nameAr: 'شبرا' }
    ]
  },
  {
    id: 'giza',
    name: 'Giza',
    nameAr: 'الجيزة',
    cities: [
      { id: 'giza-city', name: 'Giza City', nameAr: 'مدينة الجيزة' },
      { id: 'dokki', name: 'Dokki', nameAr: 'الدقي' },
      { id: 'mohandessin', name: 'Mohandessin', nameAr: 'المهندسين' },
      { id: '6th-october', name: '6th of October City', nameAr: 'مدينة 6 أكتوبر' },
      { id: 'sheikh-zayed', name: 'Sheikh Zayed City', nameAr: 'مدينة الشيخ زايد' },
      { id: 'haram', name: 'Haram', nameAr: 'الهرم' },
      { id: 'faisal', name: 'Faisal', nameAr: 'فيصل' }
    ]
  },
  {
    id: 'alexandria',
    name: 'Alexandria',
    nameAr: 'الإسكندرية',
    cities: [
      { id: 'alexandria-city', name: 'Alexandria City', nameAr: 'مدينة الإسكندرية' },
      { id: 'montaza', name: 'Montaza', nameAr: 'المنتزه' },
      { id: 'raml-station', name: 'Raml Station', nameAr: 'محطة الرمل' },
      { id: 'sidi-gaber', name: 'Sidi Gaber', nameAr: 'سيدي جابر' },
      { id: 'stanley', name: 'Stanley', nameAr: 'ستانلي' },
      { id: 'smouha', name: 'Smouha', nameAr: 'سموحة' },
      { id: 'miami', name: 'Miami', nameAr: 'ميامي' },
      { id: 'agami', name: 'Agami', nameAr: 'العجمي' }
    ]
  },
  {
    id: 'qalyubia',
    name: 'Qalyubia',
    nameAr: 'القليوبية',
    cities: [
      { id: 'benha', name: 'Benha', nameAr: 'بنها' },
      { id: 'shubra-el-kheima', name: 'Shubra El Kheima', nameAr: 'شبرا الخيمة' },
      { id: 'qalyub', name: 'Qalyub', nameAr: 'قليوب' },
      { id: 'khanka', name: 'Khanka', nameAr: 'الخانكة' },
      { id: 'qaha', name: 'Qaha', nameAr: 'قها' },
      { id: 'shibin-el-qanater', name: 'Shibin El Qanater', nameAr: 'شبين القناطر' }
    ]
  },
  {
    id: 'port-said',
    name: 'Port Said',
    nameAr: 'بورسعيد',
    cities: [
      { id: 'port-said-city', name: 'Port Said City', nameAr: 'مدينة بورسعيد' },
      { id: 'port-fouad', name: 'Port Fouad', nameAr: 'بور فؤاد' },
      { id: 'arab', name: 'Arab', nameAr: 'العرب' },
      { id: 'zohour', name: 'Zohour', nameAr: 'الزهور' }
    ]
  },
  {
    id: 'suez',
    name: 'Suez',
    nameAr: 'السويس',
    cities: [
      { id: 'suez-city', name: 'Suez City', nameAr: 'مدينة السويس' },
      { id: 'ain-sokhna', name: 'Ain Sokhna', nameAr: 'العين السخنة' },
      { id: 'ataka', name: 'Ataka', nameAr: 'عتاقة' },
      { id: 'faisal', name: 'Faisal', nameAr: 'فيصل' }
    ]
  },
  {
    id: 'dakahlia',
    name: 'Dakahlia',
    nameAr: 'الدقهلية',
    cities: [
      { id: 'mansoura', name: 'Mansoura', nameAr: 'المنصورة' },
      { id: 'talkha', name: 'Talkha', nameAr: 'طلخا' },
      { id: 'mit-ghamr', name: 'Mit Ghamr', nameAr: 'ميت غمر' },
      { id: 'dekernes', name: 'Dekernes', nameAr: 'دكرنس' },
      { id: 'aga', name: 'Aga', nameAr: 'أجا' },
      { id: 'manzala', name: 'Manzala', nameAr: 'المنزلة' }
    ]
  },
  {
    id: 'sharqia',
    name: 'Sharqia',
    nameAr: 'الشرقية',
    cities: [
      { id: 'zagazig', name: 'Zagazig', nameAr: 'الزقازيق' },
      { id: 'bilbeis', name: 'Bilbeis', nameAr: 'بلبيس' },
      { id: '10th-ramadan', name: '10th of Ramadan City', nameAr: 'مدينة العاشر من رمضان' },
      { id: 'abu-hammad', name: 'Abu Hammad', nameAr: 'أبو حماد' },
      { id: 'faqous', name: 'Faqous', nameAr: 'فاقوس' },
      { id: 'kafr-saqr', name: 'Kafr Saqr', nameAr: 'كفر صقر' }
    ]
  },
  {
    id: 'gharbia',
    name: 'Gharbia',
    nameAr: 'الغربية',
    cities: [
      { id: 'tanta', name: 'Tanta', nameAr: 'طنطا' },
      { id: 'mahalla-el-kubra', name: 'Mahalla El Kubra', nameAr: 'المحلة الكبرى' },
      { id: 'kafr-el-zayat', name: 'Kafr El Zayat', nameAr: 'كفر الزيات' },
      { id: 'zifta', name: 'Zifta', nameAr: 'زفتى' },
      { id: 'santa', name: 'Santa', nameAr: 'سنتا' },
      { id: 'samanoud', name: 'Samanoud', nameAr: 'سمنود' }
    ]
  },
  {
    id: 'menoufia',
    name: 'Menoufia',
    nameAr: 'المنوفية',
    cities: [
      { id: 'shibin-el-kom', name: 'Shibin El Kom', nameAr: 'شبين الكوم' },
      { id: 'menouf', name: 'Menouf', nameAr: 'منوف' },
      { id: 'sadat-city', name: 'Sadat City', nameAr: 'مدينة السادات' },
      { id: 'ashmoun', name: 'Ashmoun', nameAr: 'أشمون' },
      { id: 'bagour', name: 'Bagour', nameAr: 'باجور' },
      { id: 'berket-el-sabaa', name: 'Berket El Sabaa', nameAr: 'بركة السبع' }
    ]
  },
  {
    id: 'beheira',
    name: 'Beheira',
    nameAr: 'البحيرة',
    cities: [
      { id: 'damanhour', name: 'Damanhour', nameAr: 'دمنهور' },
      { id: 'kafr-el-dawar', name: 'Kafr El Dawar', nameAr: 'كفر الدوار' },
      { id: 'rashid', name: 'Rashid', nameAr: 'رشيد' },
      { id: 'edko', name: 'Edko', nameAr: 'إدكو' },
      { id: 'abu-hummus', name: 'Abu Hummus', nameAr: 'أبو حمص' },
      { id: 'delengat', name: 'Delengat', nameAr: 'دلنجات' }
    ]
  },
  {
    id: 'ismailia',
    name: 'Ismailia',
    nameAr: 'الإسماعيلية',
    cities: [
      { id: 'ismailia-city', name: 'Ismailia City', nameAr: 'مدينة الإسماعيلية' },
      { id: 'fayed', name: 'Fayed', nameAr: 'فايد' },
      { id: 'qantara-sharq', name: 'Qantara Sharq', nameAr: 'القنطرة شرق' },
      { id: 'qantara-gharb', name: 'Qantara Gharb', nameAr: 'القنطرة غرب' },
      { id: 'tel-el-kebir', name: 'Tel El Kebir', nameAr: 'تل الكبير' }
    ]
  }
];

export const getGovernorateById = (id: string): Governorate | undefined => {
  return egyptianGovernorates.find(gov => gov.id === id);
};

export const getCitiesByGovernorate = (governorateId: string): City[] => {
  const governorate = getGovernorateById(governorateId);
  return governorate ? governorate.cities : [];
};