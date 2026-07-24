import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { catalogApi, metaApi } from '../api'
import type { ApiBanner, ApiProduct, AppContent } from '../api/types'
import { defaultAppContent } from '../data/appContent'
import {
  banners as fallbackBanners,
  categories as fallbackCategories,
  type Banner,
  type Category,
} from '../data/catalog'

type ShippingSettings = {
  freeShippingMin: number
  shippingFee: number
}

type CatalogContextValue = {
  products: ApiProduct[]
  categories: Category[]
  banners: Banner[]
  appContent: AppContent
  shipping: ShippingSettings
  loading: boolean
  refreshProducts: (params?: { q?: string; category?: string }) => Promise<void>
  refreshCategories: () => Promise<void>
  refreshBanners: () => Promise<void>
  refreshAppContent: () => Promise<void>
  refreshShipping: () => Promise<void>
  getProductById: (id: string) => ApiProduct | undefined
  getProductsByCategory: (slug: string) => ApiProduct[]
  searchProducts: (query: string) => ApiProduct[]
  createProduct: (input: Partial<ApiProduct>) => Promise<ApiProduct>
  updateProduct: (id: string, input: Partial<ApiProduct>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  loadMine: () => Promise<ApiProduct[]>
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [categories, setCategories] = useState<Category[]>(fallbackCategories)
  const [banners, setBanners] = useState<Banner[]>(fallbackBanners)
  const [appContent, setAppContent] = useState<AppContent>(defaultAppContent)
  const [shipping, setShipping] = useState<ShippingSettings>({
    freeShippingMin: 199,
    shippingFee: 40,
  })
  const [loading, setLoading] = useState(true)

  const refreshProducts = useCallback(async (params?: { q?: string; category?: string }) => {
    setLoading(true)
    try {
      const res = await catalogApi.products(params)
      setProducts(res.products)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshCategories = useCallback(async () => {
    try {
      const res = await metaApi.categories()
      setCategories(res.categories)
    } catch {
      /* keep fallback */
    }
  }, [])

  const refreshBanners = useCallback(async () => {
    try {
      const res = await metaApi.banners()
      setBanners(res.banners as ApiBanner[])
    } catch {
      /* keep fallback */
    }
  }, [])

  const refreshAppContent = useCallback(async () => {
    try {
      const res = await metaApi.appContent()
      setAppContent({
        ...defaultAppContent,
        ...res.appContent,
        help: {
          ...defaultAppContent.help,
          ...res.appContent.help,
          channels: res.appContent.help?.channels ?? defaultAppContent.help.channels,
          topics: res.appContent.help?.topics ?? defaultAppContent.help.topics,
        },
      })
    } catch {
      /* keep fallback */
    }
  }, [])

  const refreshShipping = useCallback(async () => {
    try {
      const res = await metaApi.storefrontSettings()
      setShipping({
        freeShippingMin: res.settings.freeShippingMin ?? 199,
        shippingFee: res.settings.shippingFee ?? 40,
      })
    } catch {
      /* keep fallback */
    }
  }, [])

  useEffect(() => {
    void refreshProducts()
    void refreshCategories()
    void refreshBanners()
    void refreshAppContent()
    void refreshShipping()
  }, [refreshProducts, refreshCategories, refreshBanners, refreshAppContent, refreshShipping])

  const getProductById = useCallback(
    (id: string) => products.find((item) => item.id === id),
    [products],
  )

  const getProductsByCategory = useCallback(
    (slug: string) => products.filter((item) => item.categorySlug === slug),
    [products],
  )

  const searchProducts = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase()
      if (!q) return products
      return products.filter((item) => item.name.toLowerCase().includes(q))
    },
    [products],
  )

  const createProduct = useCallback(
    async (input: Partial<ApiProduct>) => {
      const res = await catalogApi.create(input)
      await refreshProducts()
      return res.product
    },
    [refreshProducts],
  )

  const updateProduct = useCallback(
    async (id: string, input: Partial<ApiProduct>) => {
      await catalogApi.update(id, input)
      await refreshProducts()
    },
    [refreshProducts],
  )

  const deleteProduct = useCallback(
    async (id: string) => {
      await catalogApi.remove(id)
      await refreshProducts()
    },
    [refreshProducts],
  )

  const loadMine = useCallback(async () => {
    const res = await catalogApi.mine()
    return res.products
  }, [])

  const value = useMemo(
    () => ({
      products,
      categories,
      banners,
      appContent,
      shipping,
      loading,
      refreshProducts,
      refreshCategories,
      refreshBanners,
      refreshAppContent,
      refreshShipping,
      getProductById,
      getProductsByCategory,
      searchProducts,
      createProduct,
      updateProduct,
      deleteProduct,
      loadMine,
    }),
    [
      products,
      categories,
      banners,
      appContent,
      shipping,
      loading,
      refreshProducts,
      refreshCategories,
      refreshBanners,
      refreshAppContent,
      refreshShipping,
      getProductById,
      getProductsByCategory,
      searchProducts,
      createProduct,
      updateProduct,
      deleteProduct,
      loadMine,
    ],
  )

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}
