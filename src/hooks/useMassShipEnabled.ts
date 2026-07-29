import { useEffect, useState } from 'react'
import { metaApi } from '../api'

/** ค่าเริ่มต้น true — ปิดได้จาก Admin → การชำระเงิน/ขนส่ง */
export function useMassShipEnabled() {
  const [enabled, setEnabled] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    void metaApi
      .storefrontSettings()
      .then((res) => {
        if (!alive) return
        setEnabled(res.settings.massShipEnabled !== false)
      })
      .catch(() => {
        if (alive) setEnabled(true)
      })
      .finally(() => {
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [])

  return { massShipEnabled: enabled, massShipLoaded: loaded }
}
