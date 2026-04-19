export interface MockProduct {
  id: string;
  name: string;
  shop: string;
  price: number;
  isSoldOut: boolean;
  color: string;
  jan?: string;
}

export interface MockGroup {
  keyType: 'Jan' | 'ProductNumber' | 'Similarity';
  keyValue?: string | number;
  label?: string;
  items: MockProduct[];
}

const C = [
  '#e85d75', '#3b82f6', '#f59e0b', '#10b981',
  '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#ec4899', '#14b8a6',
];

export const SHOPS = [
  '건담베이스', '건담붐', '코믹스아트', '영웅시대', '피규어앤컬렉션',
  '아루나샵', '레전드샵', '하비하우스', '하비큐빅', '에이지오브타이탄',
  '아이코닉토이즈', '라이즈토이즈', '마이리얼히어로', '오른팔왼팔',
  '원킹덤', '토이스로직', '피규어팝', '굿스마일컴퍼니(공홈)',
  'AmiAmi', '히어로타임', '코우마샵', '도키도키굿즈',
];

export const PRODUCTS: MockProduct[] = [
  { id: '1',  name: '넨도로이드 No.2159 프리렌',        shop: '굿스마일컴퍼니(공홈)', price: 68200,  isSoldOut: false, color: C[0],  jan: '4580590175174' },
  { id: '2',  name: '넨도로이드 프리렌 No.2159 피규어',  shop: '영웅시대',             price: 65000,  isSoldOut: false, color: C[1],  jan: '4580590175174' },
  { id: '3',  name: 'Nendoroid 2159 Frieren',           shop: 'AmiAmi',               price: 62800,  isSoldOut: false, color: C[2],  jan: '4580590175174' },
  { id: '4',  name: '피그마 프리렌 No.617',             shop: '피규어앤컬렉션',        price: 88000,  isSoldOut: false, color: C[3]  },
  { id: '5',  name: 'figma 617 프리렌 피규어',          shop: '아루나샵',             price: 82000,  isSoldOut: false, color: C[4]  },
  { id: '6',  name: '넨도로이드 2159 프리렌 국내정품',  shop: '레전드샵',             price: 72000,  isSoldOut: false, color: C[5],  jan: '4580590175174' },
  { id: '7',  name: '프리렌 프라이즈 피규어 B상',       shop: '하비하우스',           price: 28000,  isSoldOut: true,  color: C[6]  },
  { id: '8',  name: '넨도로이드 프리렌 당일발송',       shop: '히어로타임',           price: 63500,  isSoldOut: false, color: C[7],  jan: '4580590175174' },
  { id: '9',  name: '프리렌 1/7 스케일 피규어',        shop: '원킹덤',               price: 185000, isSoldOut: false, color: C[8]  },
  { id: '10', name: 'Frieren 1/7 Scale Figure',         shop: '코믹스아트',           price: 178000, isSoldOut: false, color: C[9]  },
  { id: '11', name: '넨도로이드 프리렌 미개봉',         shop: '마이리얼히어로',        price: 75000,  isSoldOut: false, color: C[10], jan: '4580590175174' },
  { id: '12', name: '피그마 617 프리렌 빠른발송',       shop: '건담베이스',           price: 89000,  isSoldOut: false, color: C[11] },
];

export const GROUPS: MockGroup[] = [
  {
    keyType: 'Jan',
    keyValue: '4580590175174',
    label: '넨도로이드 No.2159 프리렌',
    items: PRODUCTS.filter(p => p.jan === '4580590175174'),
  },
  {
    keyType: 'ProductNumber',
    keyValue: '617',
    label: 'figma No.617 프리렌',
    items: PRODUCTS.filter(p => ['4', '5', '12'].includes(p.id)),
  },
  {
    keyType: 'Similarity',
    keyValue: 0.87,
    label: '프리렌 1/7 스케일',
    items: PRODUCTS.filter(p => ['9', '10'].includes(p.id)),
  },
];
