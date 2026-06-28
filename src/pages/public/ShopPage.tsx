import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  CreditCard,
  Landmark,
  Loader2,
  Package,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackAnalyticsEvent } from '../../lib/analytics';
import { supabase } from '../../lib/supabase';

type ProductStockStatus = 'available' | 'preorder' | 'soon' | 'sold_out';

type ShopProduct = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number | null;
  price_label: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  video_urls: string[] | null;
  sizes: string[];
  badge: string | null;
  stock_status: ProductStockStatus;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
};

type CartItem = {
  product: ShopProduct;
  size: string;
  quantity: number;
};

type CheckoutFormState = {
  customerName: string;
  phone: string;
  email: string;
  memberNumber: string;
  paymentMethod: 'transferencia' | 'presencial' | 'mbway';
  deliveryMethod: 'recolha_clube' | 'entrega_combinada';
  notes: string;
};

type ProductLightboxState = {
  product: ShopProduct;
  imageIndex: number;
};

const whatsappNumber = '351913030249';

const fallbackProducts: ShopProduct[] = [
  {
    id: 'fallback-tshirt',
    name: 'T-shirt GDR Boavista',
    category: 'Vestuário',
    description: 'T-shirt oficial para atletas, famílias, sócios e simpatizantes do clube.',
    price: null,
    price_label: 'Preço a definir',
    sizes: ['6 anos', '8 anos', '10 anos', '12 anos', 'S', 'M', 'L', 'XL'],
    badge: 'Novo',
    image_url: '/logo-gdr-boavista-header-256.png',
    image_urls: ['/logo-gdr-boavista-header-256.png'],
    video_urls: [],
    stock_status: 'preorder',
    is_active: true,
    is_featured: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fallback-sweat',
    name: 'Sweat GDR Boavista',
    category: 'Vestuário',
    description: 'Sweat confortável para treinos, jogos e apoio ao clube nos dias mais frios.',
    price: null,
    price_label: 'Preço a definir',
    sizes: ['S', 'M', 'L', 'XL'],
    badge: 'Brevemente',
    image_url: '/logo-gdr-boavista-header-256.png',
    image_urls: ['/logo-gdr-boavista-header-256.png'],
    video_urls: [],
    stock_status: 'soon',
    is_active: true,
    is_featured: false,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fallback-cachecol',
    name: 'Cachecol Oficial',
    category: 'Acessórios',
    description: 'O artigo ideal para apoiar o Boavista em casa, fora e nos torneios.',
    price: null,
    price_label: 'Preço a definir',
    sizes: ['Único'],
    badge: 'Apoio',
    image_url: '/logo-gdr-boavista-header-256.png',
    image_urls: ['/logo-gdr-boavista-header-256.png'],
    video_urls: [],
    stock_status: 'preorder',
    is_active: true,
    is_featured: false,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
];

const emptyCheckoutForm: CheckoutFormState = {
  customerName: '',
  phone: '',
  email: '',
  memberNumber: '',
  paymentMethod: 'transferencia',
  deliveryMethod: 'recolha_clube',
  notes: '',
};

const stockStatusLabels: Record<ProductStockStatus, string> = {
  available: 'Disponível',
  preorder: 'Pré-encomenda',
  soon: 'Em breve',
  sold_out: 'Esgotado',
};

const paymentMethods = [
  {
    icon: Smartphone,
    value: 'mbway',
    title: 'MB WAY — em breve',
    description: 'Este método ainda não está disponível pelo clube. Será ativado numa próxima fase.',
  },
  {
    icon: Landmark,
    value: 'transferencia',
    title: 'Transferência bancária',
    description: 'Opção simples para encomendas de famílias, sócios e parceiros.',
  },
  {
    icon: Store,
    value: 'presencial',
    title: 'Pagamento no clube',
    description: 'Possibilidade de pagamento e levantamento presencial, quando combinado.',
  },
];

const orderSteps = [
  'Escolhe os produtos, tamanhos e quantidades.',
  'Adiciona tudo ao carrinho.',
  'Finaliza o checkout com os dados de contacto.',
  'O clube confirma disponibilidade, pagamento e entrega.',
];

function formatCurrency(value: number | null, label: string | null) {
  if (label?.trim()) return label;
  if (value === null || Number.isNaN(value)) return 'Preço sob consulta';

  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatNumericCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function getProductImages(product: ShopProduct) {
  const urls = [...(product.image_urls ?? []), product.image_url]
    .filter((url): url is string => Boolean(url?.trim()));

  return Array.from(new Set(urls));
}

function getProductVideos(product: ShopProduct) {
  return (product.video_urls ?? []).filter((url) => Boolean(url?.trim()));
}

function getPrimaryProductImage(product: ShopProduct) {
  return getProductImages(product)[0] ?? '/logo-gdr-boavista-header-256.png';
}

function getDefaultSize(product: ShopProduct) {
  return product.sizes?.[0] ?? 'Único';
}

export function ShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>(fallbackProducts);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormState>(emptyCheckoutForm);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<ProductLightboxState | null>(null);
  const [activeCategory, setActiveCategory] = useState('Todos');

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setIsLoadingProducts(true);

    const { data, error } = await supabase
      .from('gdrb_shop_products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      setProducts(data as ShopProduct[]);
    }

    setIsLoadingProducts(false);
  }

  const featuredProduct = useMemo(() => {
    return products.find((product) => product.is_featured) ?? products[0] ?? null;
  }, [products]);

  const categoryFilters = useMemo(() => {
    const categories = Array.from(new Set(products.map((product) => product.category).filter(Boolean)));
    return ['Todos', ...categories];
  }, [products]);

  const displayedProducts = useMemo(() => {
    if (activeCategory === 'Todos') return products;
    return products.filter((product) => product.category === activeCategory);
  }, [activeCategory, products]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      if (item.product.price === null) return total;
      return total + item.product.price * item.quantity;
    }, 0);
  }, [cartItems]);

  const cartHasPriceToConfirm = useMemo(() => {
    return cartItems.some((item) => item.product.price === null || Boolean(item.product.price_label?.trim()));
  }, [cartItems]);

  const cartItemsCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const lightboxImages = lightbox ? getProductImages(lightbox.product) : [];
  const currentLightboxImage = lightboxImages[lightbox?.imageIndex ?? 0];

  function trackShopClick(entityName: string) {
    trackAnalyticsEvent({
      eventName: 'shop_click',
      entityType: 'shop',
      entityName,
    });
  }

  function buildWhatsappUrl(productName?: string) {
    const text = productName
      ? `Olá GDR Boavista. Gostaria de obter informações sobre o produto: ${productName}.`
      : 'Olá GDR Boavista. Gostaria de obter informações sobre a loja oficial.';

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
  }

  function getSelectedSize(product: ShopProduct) {
    return selectedSizes[product.id] ?? getDefaultSize(product);
  }

  function getSelectedQuantity(product: ShopProduct) {
    return selectedQuantities[product.id] ?? 1;
  }

  function openLightbox(product: ShopProduct, imageIndex = 0) {
    const images = getProductImages(product);
    if (!images.length) return;

    setLightbox({
      product,
      imageIndex: Math.min(Math.max(imageIndex, 0), images.length - 1),
    });
    trackShopClick(`Abrir galeria - ${product.name}`);
  }

  function goToPreviousLightboxImage() {
    setLightbox((current) => {
      if (!current) return current;
      const images = getProductImages(current.product);
      if (images.length <= 1) return current;

      return {
        ...current,
        imageIndex: current.imageIndex === 0 ? images.length - 1 : current.imageIndex - 1,
      };
    });
  }

  function goToNextLightboxImage() {
    setLightbox((current) => {
      if (!current) return current;
      const images = getProductImages(current.product);
      if (images.length <= 1) return current;

      return {
        ...current,
        imageIndex: current.imageIndex === images.length - 1 ? 0 : current.imageIndex + 1,
      };
    });
  }

  function addToCart(product: ShopProduct) {
    if (product.stock_status === 'sold_out' || product.stock_status === 'soon') return;

    const size = getSelectedSize(product);
    const quantity = getSelectedQuantity(product);

    setCartItems((current) => {
      const existingIndex = current.findIndex((item) => item.product.id === product.id && item.size === size);

      if (existingIndex >= 0) {
        return current.map((item, index) => index === existingIndex ? { ...item, quantity: item.quantity + quantity } : item);
      }

      return [...current, { product, size, quantity }];
    });

    setOrderFeedback(null);
    setOrderError(null);
    setIsCartOpen(true);
    setIsCheckoutOpen(false);
    trackShopClick(`Adicionar ao carrinho - ${product.name}`);
  }

  function updateCartItemQuantity(productId: string, size: string, quantity: number) {
    const safeQuantity = Math.max(1, quantity);
    setCartItems((current) => current.map((item) => (
      item.product.id === productId && item.size === size ? { ...item, quantity: safeQuantity } : item
    )));
  }

  function removeCartItem(productId: string, size: string) {
    setCartItems((current) => current.filter((item) => !(item.product.id === productId && item.size === size)));
  }

  function startCheckout() {
    setOrderFeedback(null);
    setOrderError(null);
    setIsCheckoutOpen(true);
    trackShopClick('Abrir checkout');
  }

  async function handleCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cartItems.length) return;

    setIsSubmittingOrder(true);
    setOrderFeedback(null);
    setOrderError(null);

    const items = cartItems.map((item) => ({
      product_id: item.product.id.startsWith('fallback-') ? null : item.product.id,
      product_name: item.product.name,
      size: item.size,
      quantity: item.quantity,
      unit_price: item.product.price,
      price_label: item.product.price_label,
      image_url: getPrimaryProductImage(item.product),
    }));

    const totalLabel = cartHasPriceToConfirm ? 'Valor a confirmar pelo clube' : formatNumericCurrency(cartTotal);
    const orderSummary = cartItems.length === 1 ? cartItems[0].product.name : `${cartItems.length} produtos no carrinho`;
    const firstItem = cartItems[0];
    const detailLines = cartItems.map((item) => `- ${item.product.name} | ${item.size} | qtd ${item.quantity}`).join('\n');
    const memberNumber = checkoutForm.memberNumber.trim();
    const notes = [
      memberNumber ? `Número de sócio informado: ${memberNumber}` : '',
      memberNumber ? 'Validação de sócio/quotas: confirmar se o número de sócio existe e se as quotas estão em dia.' : '',
      checkoutForm.notes.trim(),
      `Itens do carrinho:\n${detailLines}`,
      `Total: ${totalLabel}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const { error } = await supabase.from('gdrb_shop_orders').insert({
      product_id: cartItems.length === 1 && !firstItem.product.id.startsWith('fallback-') ? firstItem.product.id : null,
      product_name: orderSummary,
      size: cartItems.length === 1 ? firstItem.size : null,
      quantity: cartItems.reduce((total, item) => total + item.quantity, 0),
      customer_name: checkoutForm.customerName.trim(),
      phone: checkoutForm.phone.trim(),
      email: checkoutForm.email.trim() || null,
      payment_method: checkoutForm.paymentMethod,
      delivery_method: checkoutForm.deliveryMethod,
      notes,
      status: 'novo',
      items,
      total_amount: cartHasPriceToConfirm ? null : cartTotal,
      total_label: totalLabel,
    });

    if (error) {
      setOrderError('Não foi possível registar o pedido automaticamente. Confirma se o SQL do carrinho foi executado no Supabase ou envia o pedido pelo WhatsApp do clube.');
    } else {
      setOrderFeedback('Pedido recebido com sucesso. O clube irá confirmar disponibilidade, pagamento e entrega.');
      setCartItems([]);
      setCheckoutForm(emptyCheckoutForm);
      setIsCheckoutOpen(false);
      trackShopClick('Checkout concluído');
    }

    setIsSubmittingOrder(false);
  }

  return (
    <div className="bg-[#f6f2ec] text-zinc-950">
      <section className="relative overflow-hidden bg-[#2f261e] py-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(184,51,54,0.20),transparent_38%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-[#4a2a22]/35" />

        <img
          src="/logo-gdr-boavista-header-256.png"
          alt=""
          className="absolute -right-20 top-12 h-[520px] w-[520px] object-contain opacity-[0.07]"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 lg:grid-cols-[1fr_0.88fr]">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-[0.45em] text-[#d6a7a0]">Loja Oficial</p>

            <h1 className="mt-8 font-serif text-6xl font-light leading-[0.95] tracking-tight md:text-8xl">
              Veste o
              <br />
              Boavista.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#e8ded4]">
              Artigos oficiais do GDR Boavista para atletas, famílias, sócios e todos os que vivem o clube dentro e fora do campo.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#produtos"
                onClick={() => trackShopClick('Ver produtos')}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#b83336] px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#a52c30]"
              >
                Ver produtos
                <ShoppingCart size={18} />
              </a>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#fff8f0] px-6 py-4 text-sm font-black uppercase tracking-wide text-[#2f261e] transition hover:bg-white"
              >
                Carrinho {cartItemsCount > 0 ? `(${cartItemsCount})` : ''}
                <ShoppingCart size={18} />
              </button>
            </div>
          </div>

          <aside className="relative hidden overflow-hidden rounded-sm border border-white/12 bg-white/[0.055] p-8 shadow-2xl backdrop-blur lg:block">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#b83336]/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
            <img
              src="/logo-gdr-boavista-header-256.png"
              alt=""
              className="absolute right-8 top-8 h-52 w-52 object-contain opacity-[0.05]"
            />

            <div className="relative">
              <div className="flex items-center gap-5">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[#fff8f0] shadow-xl">
                  <img src="/logo-gdr-boavista-header-256.png" alt="GDR Boavista" className="h-16 w-16 object-contain" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.42em] text-[#d6a7a0]">Oficial GDR Boavista</p>
                  <h2 className="mt-3 font-serif text-4xl font-light leading-tight text-white">Feito para quem vive o clube.</h2>
                </div>
              </div>

              <p className="mt-8 max-w-xl text-sm leading-7 text-[#e8ded4]">
                Uma seleção de artigos oficiais para representar o Boavista com identidade, qualidade e orgulho em todos os momentos.
              </p>

              <div className="mt-8 grid gap-3">
                <div className="flex items-center gap-3 rounded-sm border border-white/10 bg-white/[0.07] px-4 py-3">
                  <ShieldCheck size={18} className="text-[#e1b9b2]" />
                  <span className="text-sm font-bold text-white">Produtos oficiais do clube</span>
                </div>
                <div className="flex items-center gap-3 rounded-sm border border-white/10 bg-white/[0.07] px-4 py-3">
                  <Store size={18} className="text-[#e1b9b2]" />
                  <span className="text-sm font-bold text-white">Recolha e confirmação pelo GDR Boavista</span>
                </div>
                <div className="flex items-center gap-3 rounded-sm border border-white/10 bg-white/[0.07] px-4 py-3">
                  <Sparkles size={18} className="text-[#e1b9b2]" />
                  <span className="text-sm font-bold text-white">Cada compra apoia a formação</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-3">
            <article className="rounded-sm border border-zinc-200 bg-white p-7 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f8eeee] text-[#b83336]"><ShieldCheck size={26} /></div>
              <h3 className="mt-6 font-serif text-3xl font-light text-[#2f261e]">Produtos do clube</h3>
              <p className="mt-4 text-sm leading-7 text-zinc-600">Uma loja pensada para valorizar a identidade do GDR Boavista.</p>
            </article>

            <article className="rounded-sm border border-zinc-200 bg-white p-7 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f8eeee] text-[#b83336]"><CreditCard size={26} /></div>
              <h3 className="mt-6 font-serif text-3xl font-light text-[#2f261e]">Checkout simples</h3>
              <p className="mt-4 text-sm leading-7 text-zinc-600">Adiciona produtos ao carrinho e finaliza o pedido com confirmação manual pelo clube.</p>
            </article>

            <article className="rounded-sm border border-zinc-200 bg-white p-7 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f8eeee] text-[#b83336]"><Truck size={26} /></div>
              <h3 className="mt-6 font-serif text-3xl font-light text-[#2f261e]">Recolha combinada</h3>
              <p className="mt-4 text-sm leading-7 text-zinc-600">Levantamento combinado com o clube em dias de treino, jogos ou outros momentos definidos.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="produtos" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.45em] text-[#b83336]">Catálogo</p>
              <h2 className="mt-5 font-serif text-5xl font-light text-[#2f261e] md:text-6xl">Produtos oficiais.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-500">
                {isLoadingProducts
                  ? 'A carregar produtos da loja...'
                  : 'Escolha os artigos oficiais, selecione tamanho e quantidade, adicione ao carrinho e finalize o pedido de forma simples.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#2f261e] bg-[#2f261e] px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#b83336] md:w-auto"
            >
              Carrinho {cartItemsCount > 0 ? `(${cartItemsCount})` : ''}
              <ShoppingCart size={18} />
            </button>
          </div>

          {featuredProduct && (
            <article className="mt-12 overflow-hidden rounded-sm border border-zinc-200 bg-[#f6f2ec] shadow-sm">
              <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden bg-[#2f261e] p-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(184,51,54,0.18),transparent_46%)]" />
                  <img src="/logo-gdr-boavista-header-256.png" alt="" className="absolute -right-16 -top-16 h-80 w-80 object-contain opacity-[0.05]" />
                  <button type="button" onClick={() => openLightbox(featuredProduct, 0)} className="relative rounded-[2rem] bg-white p-7 shadow-2xl transition hover:scale-[1.02]">
                    <img src={getPrimaryProductImage(featuredProduct)} alt={featuredProduct.name} className="h-72 w-72 object-contain" />
                  </button>
                </div>
                <div className="p-8 md:p-12">
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-[#b83336]">Destaque da loja</p>
                  <h3 className="mt-5 font-serif text-5xl font-light leading-tight text-[#2f261e]">{featuredProduct.name}</h3>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-600">{featuredProduct.description}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-[#b83336] shadow-sm">{formatCurrency(featuredProduct.price, featuredProduct.price_label)}</span>
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-zinc-600 shadow-sm">{stockStatusLabels[featuredProduct.stock_status]}</span>
                  </div>
                  <a href={`#produto-${featuredProduct.id}`} className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#2f261e] px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#b83336]">
                    Ver artigo
                    <ChevronRight size={18} />
                  </a>
                </div>
              </div>
            </article>
          )}

          <div className="mt-10 flex flex-wrap gap-2">
            {categoryFilters.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-5 py-3 text-xs font-black uppercase tracking-wide transition ${activeCategory === category ? 'border-[#2f261e] bg-[#2f261e] text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-[#b83336] hover:text-[#b83336]'}`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {displayedProducts.map((product) => {
              const productImages = getProductImages(product);
              const productVideos = getProductVideos(product);
              const selectedSize = getSelectedSize(product);
              const selectedQuantity = getSelectedQuantity(product);
              const isUnavailable = product.stock_status === 'sold_out' || product.stock_status === 'soon';

              return (
                <article id={`produto-${product.id}`} key={product.id} className="group flex h-full flex-col overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative flex h-80 items-center justify-center overflow-hidden bg-[#2f261e]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(184,51,54,0.16),transparent_44%)]" />
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />

                    <button
                      type="button"
                      onClick={() => openLightbox(product, 0)}
                      className="relative h-52 w-52 rounded-[2rem] bg-white p-6 shadow-2xl transition duration-500 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#d6a7a0]/60 group-hover:scale-105"
                      aria-label={`Abrir galeria de imagens de ${product.name}`}
                    >
                      <img src={getPrimaryProductImage(product)} alt={product.name} className="h-full w-full object-contain" />
                      <span className="absolute inset-x-4 bottom-3 rounded-full bg-[#2f261e]/90 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white opacity-0 transition group-hover:opacity-100">
                        Ver maior
                      </span>
                    </button>

                  </div>

                  <div className="flex flex-1 flex-col bg-white p-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#f6f2ec] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#2f261e]">{product.category}</span>
                      <span className="rounded-full bg-[#f8eeee] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#b83336]">{product.badge || stockStatusLabels[product.stock_status]}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#f8eeee] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#b83336]">{formatCurrency(product.price, product.price_label)}</span>
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">{stockStatusLabels[product.stock_status]}</span>
                    </div>

                    <h3 className="mt-6 font-serif text-4xl font-light leading-tight text-[#2f261e]">{product.name}</h3>
                    <p className="mt-4 text-sm leading-7 text-zinc-600">{product.description}</p>

                    {(productImages.length > 1 || productVideos.length > 0) && (
                      <div className="mt-5 space-y-3">
                        {productImages.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {productImages.slice(0, 5).map((url, index) => (
                              <button
                                key={`${product.id}-thumb-${url}`}
                                type="button"
                                onClick={() => openLightbox(product, index)}
                                className="h-16 w-16 shrink-0 rounded-md border border-zinc-200 bg-zinc-50 p-1 transition hover:border-[#d6a7a0] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#d6a7a0]"
                                aria-label={`Ver imagem ${index + 1} de ${product.name}`}
                              >
                                <img src={url} alt={`${product.name} ${index + 1}`} className="h-full w-full object-contain" />
                              </button>
                            ))}
                          </div>
                        )}

                        {productVideos[0] && (
                          <a href={productVideos[0]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-[#2f261e] transition hover:border-[#b83336] hover:text-[#b83336]">
                            <Sparkles size={14} />
                            Ver vídeo do produto
                          </a>
                        )}
                      </div>
                    )}

                    <div className="mb-6 mt-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Escolha o artigo</p>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#b83336] shadow-sm">Carrinho</span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_88px]">
                        <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-wide text-zinc-500">
                          Tamanho/opção
                          <select
                            value={selectedSize}
                            onChange={(event) => setSelectedSizes((current) => ({ ...current, [product.id]: event.target.value }))}
                            className="min-w-0 rounded-md border border-zinc-200 bg-white px-3 py-3 text-sm font-bold normal-case tracking-normal text-zinc-800 outline-none focus:border-[#b83336]"
                          >
                            {(product.sizes?.length ? product.sizes : ['Único']).map((size) => (
                              <option key={`${product.id}-${size}`} value={size}>{size}</option>
                            ))}
                          </select>
                        </label>

                        <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-wide text-zinc-500">
                          Qtd.
                          <input
                            type="number"
                            min="1"
                            value={selectedQuantity}
                            onChange={(event) => setSelectedQuantities((current) => ({ ...current, [product.id]: Math.max(1, Number(event.target.value || 1)) }))}
                            className="w-full min-w-0 rounded-md border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-bold text-zinc-800 outline-none focus:border-[#b83336]"
                          />
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={isUnavailable}
                      className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2f261e] px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#b83336] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
                    >
                      {product.stock_status === 'soon' ? 'Em breve' : product.stock_status === 'sold_out' ? 'Esgotado' : 'Adicionar ao carrinho'}
                      <ShoppingCart size={18} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {!isLoadingProducts && displayedProducts.length === 0 && (
            <div className="mt-10 rounded-sm border border-zinc-200 bg-[#f6f2ec] p-8 text-center">
              <p className="font-serif text-3xl font-light text-[#2f261e]">Ainda não existem produtos nesta categoria.</p>
              <button type="button" onClick={() => setActiveCategory('Todos')} className="mt-5 rounded-full bg-[#2f261e] px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#b83336]">Ver todos</button>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#f6f2ec] py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.4em] text-[#b83336]">Como comprar</p>
              <h2 className="mt-5 font-serif text-5xl font-light text-[#2f261e]">Pedido simples e seguro.</h2>
              <p className="mt-6 text-sm leading-7 text-zinc-600">
                A experiência funciona como uma boutique oficial: escolhe os artigos, finaliza o carrinho e o clube confirma disponibilidade, pagamento e entrega.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {orderSteps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-sm border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#b83336] text-sm font-black text-white">{index + 1}</div>
                  <p className="text-sm font-semibold leading-7 text-zinc-700">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-sm border border-zinc-200 bg-[#2f261e] p-8 text-white shadow-xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#e0b6ae]">Pagamento</p>
                <h2 className="mt-4 font-serif text-5xl font-light">Métodos simples e funcionais.</h2>
                <p className="mt-5 text-sm leading-7 text-zinc-300">Para lançar a loja sem complicar, a confirmação do pagamento será feita manualmente pelo clube.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <article key={method.title} className="rounded-sm bg-white p-5 text-[#2f261e]">
                      <Icon size={28} className="text-[#b83336]" />
                      <h3 className="mt-4 text-base font-black uppercase tracking-wide">{method.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-zinc-600">{method.description}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3 text-sm leading-7 text-zinc-300">
                <CheckCircle size={20} className="mt-1 shrink-0 text-[#e0b6ae]" />
                <span>O pedido só fica confirmado depois de validação de disponibilidade e pagamento.</span>
              </div>

              <Link to="/contactos" onClick={() => trackShopClick('Contactos - loja')} className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-[#2f261e] transition hover:bg-[#b83336] hover:text-white">
                Contactar o clube
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#2f261e] py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#e0b6ae]">GDR Boavista</p>
            <h2 className="mt-4 font-serif text-5xl font-light">A loja começa com a força da comunidade.</h2>
          </div>

          <a href={buildWhatsappUrl()} target="_blank" rel="noreferrer" onClick={() => trackShopClick('CTA final - WhatsApp loja')} className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-4 text-sm font-black uppercase tracking-wide text-[#2f261e] transition hover:bg-[#b83336] hover:text-white">
            Falar sobre produtos
            <Sparkles size={18} />
          </a>
        </div>
      </section>

      {cartItemsCount > 0 && (
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 rounded-full bg-[#b83336] px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-2xl shadow-red-950/30 transition hover:bg-[#2f261e]"
        >
          <ShoppingCart size={20} />
          Carrinho · {cartItemsCount}
        </button>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-[#f6f2ec] shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-200 bg-white p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#b83336]">Loja oficial</p>
                <h2 className="mt-2 font-serif text-4xl font-light text-[#2f261e]">Carrinho</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-[#2f261e] transition hover:bg-[#b83336] hover:text-white"
                aria-label="Fechar carrinho"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {(orderFeedback || orderError) && (
                <div className={`mb-5 flex items-start gap-3 rounded-sm border p-4 text-sm font-semibold ${orderError ? 'border-red-200 bg-[#f8eeee] text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                  {orderError ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle size={18} className="mt-0.5 shrink-0" />}
                  <span>{orderError ?? orderFeedback}</span>
                </div>
              )}

              {!cartItems.length ? (
                <div className="rounded-sm border border-dashed border-zinc-300 bg-white p-8 text-center">
                  <Package className="mx-auto text-zinc-400" size={42} />
                  <h3 className="mt-4 text-xl font-black text-[#2f261e]">O carrinho está vazio</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-500">Escolhe um produto e adiciona ao carrinho para continuar.</p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="mt-5 rounded-md bg-[#b83336] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#2f261e]"
                  >
                    Ver produtos
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <article key={`${item.product.id}-${item.size}`} className="rounded-sm border border-zinc-200 bg-white p-4 shadow-sm">
                      <div className="flex gap-4">
                        <img src={getPrimaryProductImage(item.product)} alt="" className="h-20 w-20 rounded-xl bg-[#2f261e] object-contain p-2" />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-black text-[#2f261e]">{item.product.name}</h3>
                          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">{item.size}</p>
                          <p className="mt-2 text-sm font-black text-[#b83336]">{formatCurrency(item.product.price, item.product.price_label)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.product.id, item.size)}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-[#b83336] hover:text-white"
                          aria-label="Remover produto"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-zinc-500">
                          Quantidade
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) => updateCartItemQuantity(item.product.id, item.size, Number(event.target.value || 1))}
                            className="w-20 rounded-md border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-800 outline-none focus:border-[#b83336]"
                          />
                        </label>
                        <span className="text-sm font-black text-[#2f261e]">
                          {item.product.price === null ? 'A confirmar' : formatNumericCurrency(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </article>
                  ))}

                  <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-black uppercase tracking-[0.18em] text-zinc-500">Total</span>
                      <span className="font-serif text-3xl font-light text-[#2f261e]">
                        {cartHasPriceToConfirm ? 'A confirmar' : formatNumericCurrency(cartTotal)}
                      </span>
                    </div>
                    {cartHasPriceToConfirm && (
                      <p className="mt-3 text-sm leading-6 text-zinc-500">Alguns produtos têm preço sob consulta ou etiqueta especial. O clube confirma o valor final.</p>
                    )}
                  </div>

                  {!isCheckoutOpen ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setIsCartOpen(false)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#2f261e] bg-white px-5 py-4 text-sm font-black uppercase tracking-wide text-[#2f261e] transition hover:bg-zinc-100"
                      >
                        Continuar a comprar
                      </button>

                      <button
                        type="button"
                        onClick={startCheckout}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#b83336] px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#2f261e]"
                      >
                        Finalizar pedido
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCheckoutSubmit} className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b83336]">Checkout</p>
                        <h3 className="mt-2 text-2xl font-black text-[#2f261e]">Dados para confirmação</h3>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <label className="grid gap-2 text-sm font-bold text-zinc-700">
                          Nome
                          <input required value={checkoutForm.customerName} onChange={(event) => setCheckoutForm((current) => ({ ...current, customerName: event.target.value }))} className="rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-[#b83336]" />
                        </label>
                        <label className="grid gap-2 text-sm font-bold text-zinc-700">
                          Telefone
                          <input required value={checkoutForm.phone} onChange={(event) => setCheckoutForm((current) => ({ ...current, phone: event.target.value }))} className="rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-[#b83336]" />
                        </label>
                        <label className="grid gap-2 text-sm font-bold text-zinc-700 md:col-span-2">
                          Email
                          <input type="email" value={checkoutForm.email} onChange={(event) => setCheckoutForm((current) => ({ ...current, email: event.target.value }))} className="rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-[#b83336]" />
                        </label>
                        <label className="grid gap-2 text-sm font-bold text-zinc-700 md:col-span-2">
                          Número de sócio <span className="text-xs font-semibold text-zinc-400">opcional</span>
                          <input
                            value={checkoutForm.memberNumber}
                            onChange={(event) => setCheckoutForm((current) => ({ ...current, memberNumber: event.target.value }))}
                            className="rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-[#b83336]"
                            placeholder="Ex.: 123"
                          />
                          <span className="text-xs font-semibold leading-5 text-zinc-500">
                            Se indicares o número de sócio, o clube poderá confirmar o desconto e validar se as quotas estão em dia.
                          </span>
                        </label>
                        <label className="grid gap-2 text-sm font-bold text-zinc-700 md:col-span-2">
                          Pagamento pretendido
                          <select value={checkoutForm.paymentMethod} onChange={(event) => setCheckoutForm((current) => ({ ...current, paymentMethod: event.target.value as CheckoutFormState['paymentMethod'] }))} className="rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-[#b83336]">
                            <option value="transferencia">Transferência bancária</option>
                            <option value="presencial">Pagamento no clube</option>
                            <option value="mbway" disabled>MB WAY — em breve</option>
                          </select>
                        </label>
                        <label className="grid gap-2 text-sm font-bold text-zinc-700 md:col-span-2">
                          Entrega / recolha
                          <select value={checkoutForm.deliveryMethod} onChange={(event) => setCheckoutForm((current) => ({ ...current, deliveryMethod: event.target.value as CheckoutFormState['deliveryMethod'] }))} className="rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-[#b83336]">
                            <option value="recolha_clube">Recolha no clube</option>
                            <option value="entrega_combinada">Entrega combinada</option>
                          </select>
                        </label>
                      </div>

                      <p className="mt-3 rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-800">
                        MB WAY estará disponível em breve. Nesta fase, a confirmação será feita por transferência bancária ou pagamento presencial.
                      </p>

                      <label className="mt-4 grid gap-2 text-sm font-bold text-zinc-700">
                        Observações
                        <textarea rows={4} value={checkoutForm.notes} onChange={(event) => setCheckoutForm((current) => ({ ...current, notes: event.target.value }))} className="rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-[#b83336]" placeholder="Ex.: nome do atleta, escalão, melhor horário de contacto, informação sobre quotas..." />
                      </label>

                      <button type="submit" disabled={isSubmittingOrder} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#b83336] px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#2f261e] disabled:cursor-not-allowed disabled:opacity-60">
                        {isSubmittingOrder ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                        Confirmar pedido
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {lightbox && currentLightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#2f261e] shadow-lg transition hover:bg-[#b83336] hover:text-white"
            aria-label="Fechar galeria"
          >
            <X size={22} />
          </button>

          <div className="mx-auto flex max-h-full w-full max-w-6xl flex-col gap-4">
            <div className="flex items-center justify-between gap-4 text-white">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#e0b6ae]">Galeria do produto</p>
                <h3 className="mt-2 font-serif text-3xl font-light md:text-5xl">{lightbox.product.name}</h3>
              </div>

              <span className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
                {lightbox.imageIndex + 1} / {lightboxImages.length}
              </span>
            </div>

            <div className="relative flex min-h-[52vh] items-center justify-center overflow-hidden rounded-2xl bg-white p-4 shadow-2xl md:min-h-[68vh] md:p-8">
              <img src={currentLightboxImage} alt={`${lightbox.product.name} - imagem ${lightbox.imageIndex + 1}`} className="max-h-[68vh] w-full object-contain" />

              {lightboxImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goToPreviousLightboxImage}
                    className="absolute left-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#2f261e]/90 text-white shadow-lg transition hover:bg-[#b83336] md:left-5 md:h-14 md:w-14"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft size={26} />
                  </button>

                  <button
                    type="button"
                    onClick={goToNextLightboxImage}
                    className="absolute right-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#2f261e]/90 text-white shadow-lg transition hover:bg-[#b83336] md:right-5 md:h-14 md:w-14"
                    aria-label="Imagem seguinte"
                  >
                    <ChevronRight size={26} />
                  </button>
                </>
              )}
            </div>

            {lightboxImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto rounded-2xl bg-white/10 p-3">
                {lightboxImages.map((url, index) => (
                  <button
                    key={`${lightbox.product.id}-lightbox-${url}`}
                    type="button"
                    onClick={() => setLightbox((current) => current ? { ...current, imageIndex: index } : current)}
                    className={`h-20 w-20 shrink-0 rounded-xl border-2 bg-white p-1 transition ${
                      lightbox.imageIndex === index ? 'border-red-500 shadow-lg shadow-red-950/40' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    aria-label={`Abrir imagem ${index + 1}`}
                  >
                    <img src={url} alt="" className="h-full w-full rounded-lg object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
