export type ThaiAddressRow = {
  district: string // ตำบล/แขวง
  amphoe: string // อำเภอ/เขต
  province: string
  zipcode: number | string
}

type SearchFn = (searchStr: string, maxResult?: number) => ThaiAddressRow[]

/** 77 จังหวัด (เรียงตามตัวอักษร) */
export const THAI_PROVINCES = [
  'กระบี่',
  'กรุงเทพมหานคร',
  'กาญจนบุรี',
  'กาฬสินธุ์',
  'กำแพงเพชร',
  'ขอนแก่น',
  'จันทบุรี',
  'ฉะเชิงเทรา',
  'ชลบุรี',
  'ชัยนาท',
  'ชัยภูมิ',
  'ชุมพร',
  'ตรัง',
  'ตราด',
  'ตาก',
  'นครนายก',
  'นครปฐม',
  'นครพนม',
  'นครราชสีมา',
  'นครศรีธรรมราช',
  'นครสวรรค์',
  'นนทบุรี',
  'นราธิวาส',
  'น่าน',
  'บึงกาฬ',
  'บุรีรัมย์',
  'ปทุมธานี',
  'ประจวบคีรีขันธ์',
  'ปราจีนบุรี',
  'ปัตตานี',
  'พระนครศรีอยุธยา',
  'พะเยา',
  'พังงา',
  'พัทลุง',
  'พิจิตร',
  'พิษณุโลก',
  'ภูเก็ต',
  'มหาสารคาม',
  'มุกดาหาร',
  'ยะลา',
  'ยโสธร',
  'ระนอง',
  'ระยอง',
  'ราชบุรี',
  'ร้อยเอ็ด',
  'ลพบุรี',
  'ลำปาง',
  'ลำพูน',
  'ศรีสะเกษ',
  'สกลนคร',
  'สงขลา',
  'สตูล',
  'สมุทรปราการ',
  'สมุทรสงคราม',
  'สมุทรสาคร',
  'สระบุรี',
  'สระแก้ว',
  'สิงห์บุรี',
  'สุพรรณบุรี',
  'สุราษฎร์ธานี',
  'สุรินทร์',
  'สุโขทัย',
  'หนองคาย',
  'หนองบัวลำภู',
  'อำนาจเจริญ',
  'อุดรธานี',
  'อุตรดิตถ์',
  'อุทัยธานี',
  'อุบลราชธานี',
  'อ่างทอง',
  'เชียงราย',
  'เชียงใหม่',
  'เพชรบุรี',
  'เพชรบูรณ์',
  'เลย',
  'แพร่',
  'แม่ฮ่องสอน',
] as const

let searchByProvince: SearchFn | null = null
let loading: Promise<void> | null = null
const cache = new Map<string, ThaiAddressRow[]>()

export async function ensureThaiAddressDb(): Promise<void> {
  if (searchByProvince) return
  if (!loading) {
    loading = import('thai-address-database').then((mod) => {
      searchByProvince = mod.searchAddressByProvince as SearchFn
    })
  }
  await loading
}

export function rowsForProvince(province: string): ThaiAddressRow[] {
  if (!searchByProvince) return []
  const key = province.trim()
  if (!key) return []
  const hit = cache.get(key)
  if (hit) return hit
  const rows = searchByProvince(key, 50000).filter((r) => r.province === key)
  cache.set(key, rows)
  return rows
}

export function amphoesForProvince(province: string): string[] {
  return [...new Set(rowsForProvince(province).map((r) => r.amphoe))].sort((a, b) =>
    a.localeCompare(b, 'th'),
  )
}

export function tambonsForAmphoe(province: string, amphoe: string): ThaiAddressRow[] {
  return rowsForProvince(province)
    .filter((r) => r.amphoe === amphoe)
    .sort((a, b) => a.district.localeCompare(b.district, 'th'))
}

export function filterList(items: string[], query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => item.toLowerCase().includes(q))
}

export function formatLocationLabel(parts: {
  province?: string
  amphoe?: string
  tambon?: string
  zipcode?: string
}): string {
  const { province, amphoe, tambon, zipcode } = parts
  if (!province) return ''
  return [province, amphoe, zipcode, tambon].filter(Boolean).join(' / ')
}
