// =====================================================
// Données géographiques de la République Démocratique du Congo
// 26 provinces · ~145 territoires
// =====================================================

export interface ProvinceRDC {
  nom: string;
  territoires: string[];
}

export const PROVINCES_RDC: ProvinceRDC[] = [
  {
    nom: 'Kinshasa',
    territoires: [
      'Bandalungwa', 'Barumbu', 'Bumbu', 'Gombe', 'Kalamu',
      'Kasa-Vubu', 'Kimbanseke', 'Kinshasa', 'Kintambo', 'Kisenso',
      'Lemba', 'Limete', 'Lingwala', 'Makala', 'Maluku',
      'Masina', 'Matete', 'Mont-Ngafula', 'Ndjili', 'Ngaba',
      'Ngaliema', 'Ngiri-Ngiri', 'Nsele', 'Selembao',
    ],
  },
  {
    nom: 'Kongo-Central',
    territoires: ['Boma', 'Kimvula', 'Luozi', 'Madimba', 'Mbanza-Ngungu', 'Moanda', 'Songololo'],
  },
  {
    nom: 'Kwango',
    territoires: ['Feshi', 'Kahemba', 'Kasongo-Lunda', 'Kenge', 'Popokabaka'],
  },
  {
    nom: 'Kwilu',
    territoires: ['Bagata', 'Bulungu', 'Gungu', 'Idiofa', 'Masi-Manimba'],
  },
  {
    nom: 'Mai-Ndombe',
    territoires: ['Bolobo', 'Inongo', 'Kiri', 'Kutu', 'Oshwe'],
  },
  {
    nom: 'Kasaï',
    territoires: ['Dekese', 'Ilebo', 'Luebo', 'Mweka', 'Tshikapa'],
  },
  {
    nom: 'Kasaï-Central',
    territoires: ['Demba', 'Dibaya', 'Dimbelenge', 'Kamonia', 'Kazumba', 'Luiza'],
  },
  {
    nom: 'Kasaï-Oriental',
    territoires: ['Kabeya-Kamwanga', 'Katanda', 'Lupatapata', 'Tshilenge'],
  },
  {
    nom: 'Lomami',
    territoires: ['Kabinda', 'Kamiji', 'Lubao', 'Manga', 'Ngandajika'],
  },
  {
    nom: 'Sankuru',
    territoires: ['Katako-Kombe', 'Kole', 'Lodja', 'Lomela', 'Lubefu', 'Lusambo'],
  },
  {
    nom: 'Maniema',
    territoires: ['Kabambare', 'Kailo', 'Kasongo', 'Kibombo', 'Lubutu', 'Pangi', 'Punia'],
  },
  {
    nom: 'Sud-Kivu',
    territoires: ['Fizi', 'Idjwi', 'Kabare', 'Kalehe', 'Mwenga', 'Shabunda', 'Uvira', 'Walungu'],
  },
  {
    nom: 'Nord-Kivu',
    territoires: ['Beni', 'Lubero', 'Masisi', 'Nyiragongo', 'Rutshuru', 'Walikale'],
  },
  {
    nom: 'Ituri',
    territoires: ['Aru', 'Djugu', 'Irumu', 'Mahagi', 'Mambasa'],
  },
  {
    nom: 'Haut-Uele',
    territoires: ['Dungu', 'Faradje', 'Niangara', 'Rungu', 'Wamba', 'Watsa'],
  },
  {
    nom: 'Tshopo',
    territoires: ['Bafwasende', 'Banalia', 'Basoko', 'Isangi', 'Opala', 'Ubundu', 'Yahuma'],
  },
  {
    nom: 'Bas-Uele',
    territoires: ['Aketi', 'Ango', 'Bambesa', 'Buta', 'Poko'],
  },
  {
    nom: 'Nord-Ubangi',
    territoires: ['Bosobolo', 'Businga', 'Gbadolite', 'Mobayi-Mbongo', 'Yakoma'],
  },
  {
    nom: 'Mongala',
    territoires: ['Bongandanga', 'Bumba', 'Lisala'],
  },
  {
    nom: 'Sud-Ubangi',
    territoires: ['Budjala', 'Gemena', 'Kungu', 'Libenge', 'Mankanza', 'Zongo'],
  },
  {
    nom: 'Équateur',
    territoires: ['Basankusu', 'Bikoro', 'Bolomba', 'Bomongo', 'Ingende', 'Lukolela'],
  },
  {
    nom: 'Tshuapa',
    territoires: ['Befale', 'Boende', 'Bokungu', 'Djolu', 'Ikela', 'Monkoto'],
  },
  {
    nom: 'Tanganyika',
    territoires: ['Kabalo', 'Kalemie', 'Kongolo', 'Manono', 'Moba', 'Nyunzu'],
  },
  {
    nom: 'Haut-Lomami',
    territoires: ['Bukama', 'Kabongo', 'Kaniama', 'Malemba-Nkulu'],
  },
  {
    nom: 'Lualaba',
    territoires: ['Dilolo', 'Kapanga', 'Lubudi', 'Mutshatsha', 'Sandoa'],
  },
  {
    nom: 'Haut-Katanga',
    territoires: ['Kambove', 'Kasenga', 'Kipushi', 'Mitwaba', 'Pweto'],
  },
];

export const NOMS_PROVINCES: string[] = PROVINCES_RDC.map(p => p.nom);

export function getTerritoiresByProvince(province: string): string[] {
  return PROVINCES_RDC.find(p => p.nom === province)?.territoires ?? [];
}
