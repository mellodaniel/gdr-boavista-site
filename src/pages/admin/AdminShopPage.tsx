import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  CheckCircle,
  ChevronDown,
  FileDown,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type ProductStockStatus = 'available' | 'preorder' | 'soon' | 'sold_out';
type OrderStatus = 'novo' | 'aguardar_pagamento' | 'pago' | 'entregue' | 'cancelado';

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
  updated_at: string | null;
};

type CartOrderItem = {
  product_id?: string | null;
  product_name?: string;
  name?: string;
  size?: string | null;
  quantity?: number;
  price?: number | null;
  price_label?: string | null;
  total?: number | null;
};

type ShopOrder = {
  id: string;
  order_number?: string | null;
  product_id: string | null;
  product_name: string;
  size: string | null;
  quantity: number;
  customer_name: string;
  email: string | null;
  phone: string;
  payment_method: 'transferencia' | 'presencial' | 'mbway';
  delivery_method: 'recolha_clube' | 'entrega_combinada';
  notes: string | null;
  status: OrderStatus;
  items?: CartOrderItem[] | null;
  total_amount?: number | null;
  total_label?: string | null;
  created_at: string;
  updated_at: string | null;
};

type ProductFormState = {
  name: string;
  description: string;
  category: string;
  price: string;
  priceLabel: string;
  imageUrls: string[];
  videoUrls: string[];
  sizes: string;
  badge: string;
  stockStatus: ProductStockStatus;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: string;
};

const emptyProductForm: ProductFormState = {
  name: '',
  description: '',
  category: 'Vestuário',
  price: '',
  priceLabel: '',
  imageUrls: [],
  videoUrls: [],
  sizes: 'Único',
  badge: '',
  stockStatus: 'preorder',
  isActive: true,
  isFeatured: false,
  sortOrder: '0',
};


const categoryOptions = [
  'Vestuário',
  'Equipamento de jogo',
  'Equipamento de treino',
  'Acessórios',
  'Cachecóis e bandeiras',
  'Merchandising',
  'Criança',
  'Família',
  'Guarda-redes',
  'Packs',
  'Outlet',
  'Outro',
];

const sizeOptions = [
  'Único',
  '2 anos',
  '4 anos',
  '6 anos',
  '8 anos',
  '10 anos',
  '12 anos',
  '14 anos',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '3XL',
];

const stockStatusLabels: Record<ProductStockStatus, string> = {
  available: 'Disponível',
  preorder: 'Pré-encomenda',
  soon: 'Em breve',
  sold_out: 'Esgotado',
};

const orderStatusLabels: Record<OrderStatus, string> = {
  novo: 'Novo',
  aguardar_pagamento: 'A aguardar pagamento',
  pago: 'Pago',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const paymentMethodLabels: Record<ShopOrder['payment_method'], string> = {
  transferencia: 'Transferência bancária',
  presencial: 'Pagamento no clube',
  mbway: 'MB WAY — em breve',
};

const deliveryMethodLabels: Record<ShopOrder['delivery_method'], string> = {
  recolha_clube: 'Recolha no clube',
  entrega_combinada: 'Entrega combinada',
};


type OrderFilter = 'active' | 'all' | OrderStatus;

const orderFilterLabels: Record<OrderFilter, string> = {
  active: 'Pedidos ativos',
  all: 'Todos os pedidos',
  novo: 'Novos',
  aguardar_pagamento: 'A aguardar pagamento',
  pago: 'Pagos',
  entregue: 'Entregues / consulta',
  cancelado: 'Cancelados',
};

function formatCurrency(value: number | null, label: string | null) {
  if (label?.trim()) return label;
  if (value === null || Number.isNaN(value)) return 'Preço sob consulta';

  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}


function getOrderItems(order: ShopOrder): CartOrderItem[] {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items;
  }

  return [
    {
      product_id: order.product_id,
      product_name: order.product_name,
      size: order.size,
      quantity: order.quantity,
    },
  ];
}

function getOrderItemName(item: CartOrderItem) {
  return item.product_name || item.name || 'Produto';
}

function getOrderTotalLabel(order: ShopOrder) {
  if (order.total_label?.trim()) return order.total_label;
  if (typeof order.total_amount === 'number' && !Number.isNaN(order.total_amount)) {
    return formatCurrency(order.total_amount, null);
  }

  return 'Valor a confirmar pelo clube';
}

function getOrderMemberNumber(order: ShopOrder) {
  if (!order.notes) return '';

  const patterns = [
    /Número de sócio informado:\s*([^\n]+)/i,
    /N[.ººo]*\s*de sócio:\s*([^\n]+)/i,
    /sócio\s*n[.ººo]*\s*:?\s*([^\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = order.notes.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return '';
}

function getOrderNumber(order: ShopOrder) {
  if (order.order_number?.trim()) return order.order_number;

  const date = new Date(order.created_at);
  const year = Number.isNaN(date.getTime()) ? '0000' : String(date.getFullYear());
  const month = Number.isNaN(date.getTime()) ? '00' : String(date.getMonth() + 1).padStart(2, '0');
  const day = Number.isNaN(date.getTime()) ? '00' : String(date.getDate()).padStart(2, '0');
  return `GDRB-${year}${month}${day}-${order.id.slice(0, 6).toUpperCase()}`;
}

function getStatusTone(status: OrderStatus) {
  if (status === 'novo') return 'bg-blue-50 text-blue-700';
  if (status === 'aguardar_pagamento') return 'bg-amber-50 text-amber-700';
  if (status === 'pago') return 'bg-emerald-50 text-emerald-700';
  if (status === 'entregue') return 'bg-zinc-100 text-zinc-600';
  return 'bg-red-50 text-red-700';
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getPublicImageUrl(path: string) {
  const { data } = supabase.storage.from('gdrb-shop-products').getPublicUrl(path);
  return data.publicUrl;
}

export function AdminShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderFilter>('active');
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShopData();
  }, []);

  async function loadShopData() {
    setIsLoading(true);
    setError(null);

    const [productsResponse, ordersResponse] = await Promise.all([
      supabase
        .from('gdrb_shop_products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase
        .from('gdrb_shop_orders')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    if (productsResponse.error) {
      setError('Não foi possível carregar os produtos. Confirma se o SQL da loja já foi executado no Supabase.');
      setProducts([]);
    } else {
      setProducts((productsResponse.data ?? []) as ShopProduct[]);
    }

    if (ordersResponse.error) {
      setOrders([]);
    } else {
      setOrders((ordersResponse.data ?? []) as ShopOrder[]);
    }

    setIsLoading(false);
  }

  const filteredProducts = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return products;

    return products.filter((product) => {
      return [product.name, product.category, product.description ?? '', product.badge ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [products, searchTerm]);

  const filteredOrders = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        orderStatusFilter === 'all'
          ? true
          : orderStatusFilter === 'active'
            ? order.status !== 'entregue' && order.status !== 'cancelado'
            : order.status === orderStatusFilter;

      if (!matchesStatus) return false;
      if (!normalized) return true;

      const itemsText = getOrderItems(order)
        .map((item) => [getOrderItemName(item), item.size ?? '', item.quantity ?? 1].join(' '))
        .join(' ');

      return [
        order.customer_name,
        order.phone,
        order.email ?? '',
        order.product_name,
        order.size ?? '',
        order.status,
        paymentMethodLabels[order.payment_method],
        deliveryMethodLabels[order.delivery_method],
        itemsText,
        order.notes ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [orders, orderStatusFilter, searchTerm]);

  const orderSummary = useMemo(() => {
    return {
      active: orders.filter((order) => order.status !== 'entregue' && order.status !== 'cancelado').length,
      delivered: orders.filter((order) => order.status === 'entregue').length,
      waitingPayment: orders.filter((order) => order.status === 'aguardar_pagamento').length,
    };
  }, [orders]);

  function buildOrderExportRows(sourceOrders: ShopOrder[]) {
    return sourceOrders.map((order) => {
      const items = getOrderItems(order)
        .map((item) => {
          const quantity = item.quantity ?? 1;
          const size = item.size ? ` | ${item.size}` : '';
          return `${getOrderItemName(item)}${size} | qtd ${quantity}`;
        })
        .join(' ; ');

      return {
        numero: getOrderNumber(order),
        id: order.id,
        data: formatDate(order.created_at),
        estado: orderStatusLabels[order.status],
        cliente: order.customer_name,
        telefone: order.phone,
        email: order.email ?? '',
        pagamento: paymentMethodLabels[order.payment_method],
        entrega: deliveryMethodLabels[order.delivery_method],
        artigos: items,
        socio: getOrderMemberNumber(order),
        total: getOrderTotalLabel(order),
        observacoes: order.notes ?? '',
      };
    });
  }

  function exportOrders(format: 'csv' | 'xls') {
    const rows = buildOrderExportRows(filteredOrders);
    const headers = ['N.º Pedido', 'ID técnico', 'Data', 'Estado', 'Cliente', 'Telefone', 'Email', 'N.º Sócio', 'Pagamento', 'Entrega', 'Artigos', 'Total', 'Observações'];
    const filenameDate = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const csv = [
        headers.map(escapeCsv).join(';'),
        ...rows.map((row) =>
          [
            row.numero,
            row.id,
            row.data,
            row.estado,
            row.cliente,
            row.telefone,
            row.email,
            row.socio,
            row.pagamento,
            row.entrega,
            row.artigos,
            row.total,
            row.observacoes,
          ]
            .map(escapeCsv)
            .join(';'),
        ),
      ].join('\n');

      downloadBlob(`﻿${csv}`, `gdr-boavista-pedidos-${filenameDate}.csv`, 'text/csv;charset=utf-8;');
      return;
    }

    const tableRows = rows
      .map(
        (row) => `
          <tr>
            <td>${row.numero}</td>
            <td>${row.id}</td>
            <td>${row.data}</td>
            <td>${row.estado}</td>
            <td>${row.cliente}</td>
            <td>${row.telefone}</td>
            <td>${row.email}</td>
            <td>${row.socio}</td>
            <td>${row.pagamento}</td>
            <td>${row.entrega}</td>
            <td>${row.artigos}</td>
            <td>${row.total}</td>
            <td>${row.observacoes}</td>
          </tr>
        `,
      )
      .join('');

    const html = `
      <html>
        <head><meta charset="utf-8" /></head>
        <body>
          <table border="1">
            <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    downloadBlob(html, `gdr-boavista-pedidos-${filenameDate}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  }

  function updateForm<K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const selectedSizes = useMemo(() => {
    return form.sizes
      .split(',')
      .map((size) => size.trim())
      .filter(Boolean);
  }, [form.sizes]);

  function toggleSizeOption(size: string) {
    const currentSizes = form.sizes
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const hasSize = currentSizes.includes(size);
    const nextSizes = hasSize
      ? currentSizes.filter((item) => item !== size)
      : [...currentSizes, size];

    updateForm('sizes', nextSizes.length ? nextSizes.join(', ') : 'Único');
  }


  function resetForm() {
    setForm(emptyProductForm);
    setEditingProductId(null);
    setIsProductFormOpen(false);
    setFeedback(null);
    setError(null);
  }

  function editProduct(product: ShopProduct) {
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? '',
      category: product.category,
      price: product.price === null ? '' : String(product.price),
      priceLabel: product.price_label ?? '',
      imageUrls: product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : [],
      videoUrls: product.video_urls ?? [],
      sizes: product.sizes?.length ? product.sizes.join(', ') : 'Único',
      badge: product.badge ?? '',
      stockStatus: product.stock_status,
      isActive: product.is_active,
      isFeatured: product.is_featured,
      sortOrder: String(product.sort_order ?? 0),
    });
    setActiveTab('products');
    setIsProductFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildStoragePath(file: File, folder: 'images' | 'videos') {
    const extension = file.name.split('.').pop() || (folder === 'images' ? 'jpg' : 'mp4');
    const safeName = file.name
      .replace(/\.[^/.]+$/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    return `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}.${extension}`;
  }

  async function uploadShopFiles(files: FileList, folder: 'images' | 'videos') {
    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      const path = buildStoragePath(file, folder);
      const { error: uploadError } = await supabase.storage
        .from('gdrb-shop-products')
        .upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        throw uploadError;
      }

      uploadedUrls.push(getPublicImageUrl(path));
    }

    return uploadedUrls;
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploadedUrls = await uploadShopFiles(files, 'images');
      setForm((current) => ({
        ...current,
        imageUrls: [...current.imageUrls, ...uploadedUrls],
      }));
      setFeedback(uploadedUrls.length === 1 ? 'Imagem carregada com sucesso.' : 'Imagens carregadas com sucesso.');
    } catch {
      setError('Não foi possível fazer upload das imagens. Confirma se o bucket público gdrb-shop-products existe no Supabase Storage.');
    }

    setIsUploading(false);
    event.target.value = '';
  }

  async function handleVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploadedUrls = await uploadShopFiles(files, 'videos');
      setForm((current) => ({
        ...current,
        videoUrls: [...current.videoUrls, ...uploadedUrls],
      }));
      setFeedback(uploadedUrls.length === 1 ? 'Vídeo carregado com sucesso.' : 'Vídeos carregados com sucesso.');
    } catch {
      setError('Não foi possível fazer upload dos vídeos. Confirma se o bucket público gdrb-shop-products existe no Supabase Storage.');
    }

    setIsUploading(false);
    event.target.value = '';
  }

  function removeProductImage(url: string) {
    setForm((current) => ({
      ...current,
      imageUrls: current.imageUrls.filter((item) => item !== url),
    }));
  }

  function removeProductVideo(url: string) {
    setForm((current) => ({
      ...current,
      videoUrls: current.videoUrls.filter((item) => item !== url),
    }));
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    setError(null);

    const sizes = form.sizes
      .split(',')
      .map((size) => size.trim())
      .filter(Boolean);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || 'Produto',
      price: form.price.trim() ? Number(form.price.replace(',', '.')) : null,
      price_label: form.priceLabel.trim() || null,
      image_url: form.imageUrls[0] ?? null,
      image_urls: form.imageUrls,
      video_urls: form.videoUrls,
      sizes: sizes.length ? sizes : ['Único'],
      badge: form.badge.trim() || null,
      stock_status: form.stockStatus,
      is_active: form.isActive,
      is_featured: form.isFeatured,
      sort_order: Number(form.sortOrder || 0),
      updated_at: new Date().toISOString(),
    };

    const response = editingProductId
      ? await supabase.from('gdrb_shop_products').update(payload).eq('id', editingProductId)
      : await supabase.from('gdrb_shop_products').insert(payload);

    if (response.error) {
      setError('Não foi possível guardar o produto. Confirma os campos e a estrutura da tabela.');
    } else {
      setFeedback(editingProductId ? 'Produto atualizado com sucesso.' : 'Produto criado com sucesso.');
      resetForm();
      await loadShopData();
    }

    setIsSaving(false);
  }

  async function toggleProductActive(product: ShopProduct) {
    const { error: updateError } = await supabase
      .from('gdrb_shop_products')
      .update({ is_active: !product.is_active, updated_at: new Date().toISOString() })
      .eq('id', product.id);

    if (updateError) {
      setError('Não foi possível alterar o estado do produto.');
      return;
    }

    await loadShopData();
  }

  async function deleteProduct(product: ShopProduct) {
    const confirmed = window.confirm(`Eliminar o produto "${product.name}"? Esta ação não remove pedidos já criados.`);
    if (!confirmed) return;

    const { error: deleteError } = await supabase.from('gdrb_shop_products').delete().eq('id', product.id);

    if (deleteError) {
      setError('Não foi possível eliminar o produto.');
      return;
    }

    await loadShopData();
  }

  async function updateOrderStatus(order: ShopOrder, status: OrderStatus) {
    const { error: updateError } = await supabase
      .from('gdrb_shop_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    if (updateError) {
      setError('Não foi possível atualizar o estado do pedido.');
      return;
    }

    await loadShopData();
  }

  function toggleOrderDetails(orderId: string) {
    setExpandedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-sm bg-[#24180f] p-8 text-white shadow-xl">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-300">Loja oficial</p>
            <h1 className="mt-4 font-serif text-5xl font-light">Produtos e pedidos</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
              Gere os produtos da loja do GDR Boavista, carrega fotografias, define preços e acompanha os pedidos recebidos pelo site.
            </p>
          </div>

          <button
            type="button"
            onClick={loadShopData}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-[#24180f] transition hover:bg-red-700 hover:text-white"
          >
            <RefreshCw size={17} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Produtos</p>
          <p className="mt-3 text-3xl font-black text-[#24180f]">{products.length}</p>
        </div>
        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Ativos</p>
          <p className="mt-3 text-3xl font-black text-[#24180f]">{products.filter((product) => product.is_active).length}</p>
        </div>
        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Pedidos ativos</p>
          <p className="mt-3 text-3xl font-black text-[#24180f]">{orderSummary.active}</p>
        </div>
        <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Entregues</p>
          <p className="mt-3 text-3xl font-black text-[#24180f]">{orderSummary.delivered}</p>
        </div>
      </div>

      {(feedback || error) && (
        <div className={`rounded-sm border p-4 text-sm font-semibold ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {error ?? feedback}
        </div>
      )}

      <div className="space-y-8">
        <form onSubmit={handleProductSubmit} className="rounded-sm border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <button
              type="button"
              onClick={() => setIsProductFormOpen((current) => !current)}
              className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-red-700">Gestão de produto</p>
                <h2 className="mt-2 font-serif text-3xl font-light text-[#24180f]">
                  {editingProductId ? 'Editar produto' : 'Novo produto'}
                </h2>
                <p className="mt-2 text-sm font-semibold text-zinc-500">
                  {isProductFormOpen
                    ? 'Preenche os dados, media, tamanhos e visibilidade do produto.'
                    : 'Formulário recolhido para manter a administração da loja mais limpa.'}
                </p>
              </div>
              <span className="hidden rounded-full bg-zinc-100 p-3 text-[#24180f] sm:inline-flex">
                <ChevronDown size={20} className={`transition ${isProductFormOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>

            <div className="flex flex-wrap gap-2">
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-xs font-black uppercase tracking-wide text-zinc-600 hover:border-red-700 hover:text-red-700"
                >
                  <X size={15} />
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsProductFormOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-md bg-[#24180f] px-4 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-700"
              >
                <ChevronDown size={16} className={`transition ${isProductFormOpen ? 'rotate-180' : ''}`} />
                {isProductFormOpen ? 'Recolher formulário' : 'Abrir formulário'}
              </button>
            </div>
          </div>

          {isProductFormOpen && (
            <div className="border-t border-zinc-100 p-6 pt-5">
              <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Nome do produto
              <input
                required
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                className="rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-red-700"
                placeholder="Ex.: T-shirt GDR Boavista"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-zinc-700">
              Descrição
              <textarea
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                rows={4}
                className="rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-red-700"
                placeholder="Descrição curta para aparecer na loja pública"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-zinc-700">
                Categoria
                <select
                  value={form.category}
                  onChange={(event) => updateForm('category', event.target.value)}
                  className="h-[50px] rounded-md border border-zinc-200 bg-white px-4 py-3 outline-none focus:border-red-700"
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-zinc-700">
                Badge
                <input
                  value={form.badge}
                  onChange={(event) => updateForm('badge', event.target.value)}
                  className="rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-red-700"
                  placeholder="Novo, Oficial, Família..."
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-zinc-700">
                Preço numérico
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(event) => updateForm('price', event.target.value)}
                  className="rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-red-700"
                  placeholder="Ex.: 15.00"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-zinc-700">
                Texto do preço
                <input
                  value={form.priceLabel}
                  onChange={(event) => updateForm('priceLabel', event.target.value)}
                  className="rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-red-700"
                  placeholder="Ex.: Preço sob consulta"
                />
              </label>
            </div>

            <div className="grid gap-2 text-sm font-bold text-zinc-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Tamanhos / opções disponíveis</span>
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
                  Infantil ao adulto
                </span>
              </div>

              <div className="rounded-md border border-zinc-200 bg-white p-3">
                <div className="max-h-36 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {sizeOptions.map((size) => {
                      const isSelected = selectedSizes.includes(size);

                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSizeOption(size)}
                          className={`rounded-md border px-3 py-2 text-left text-xs font-black uppercase tracking-wide transition ${
                            isSelected
                              ? 'border-red-700 bg-red-700 text-white shadow-sm'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-red-200 hover:bg-red-50'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-500">
                  Selecionados: <span className="text-zinc-800">{selectedSizes.join(', ') || 'Único'}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-sm border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-zinc-700">Media do produto</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-zinc-500">
                    Carrega uma ou várias imagens e, opcionalmente, vídeos curtos do produto. A primeira imagem será usada como capa.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-md bg-[#24180f] px-4 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-700">
                    {isUploading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                    Upload imagens
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                  </label>

                  <label className="inline-flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-[#24180f] transition hover:border-red-700 hover:text-red-700">
                    {isUploading ? <RefreshCw size={16} className="animate-spin" /> : <Video size={16} />}
                    Upload vídeos
                    <input type="file" accept="video/*" multiple className="hidden" onChange={handleVideoUpload} disabled={isUploading} />
                  </label>
                </div>
              </div>

              {form.imageUrls.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Imagens</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {form.imageUrls.map((url, index) => (
                      <div key={url} className="relative overflow-hidden rounded-sm border border-zinc-200 bg-white p-2">
                        <img src={url} alt={`Imagem ${index + 1}`} className="h-32 w-full rounded-sm object-contain" />
                        {index === 0 && (
                          <span className="absolute left-3 top-3 rounded-full bg-red-700 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                            Capa
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeProductImage(url)}
                          className="absolute right-3 top-3 rounded-full bg-white p-1 text-zinc-700 shadow hover:bg-red-700 hover:text-white"
                          aria-label="Remover imagem"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.videoUrls.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Vídeos</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {form.videoUrls.map((url, index) => (
                      <div key={url} className="relative overflow-hidden rounded-sm border border-zinc-200 bg-white p-2">
                        <video src={url} controls preload="metadata" className="h-40 w-full rounded-sm bg-black object-contain" />
                        <span className="absolute left-3 top-3 rounded-full bg-[#24180f] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                          Vídeo {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeProductVideo(url)}
                          className="absolute right-3 top-3 rounded-full bg-white p-1 text-zinc-700 shadow hover:bg-red-700 hover:text-white"
                          aria-label="Remover vídeo"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_120px_minmax(240px,0.9fr)]">
              <label className="grid gap-2 text-sm font-bold text-zinc-700">
                Estado do produto
                <select
                  value={form.stockStatus}
                  onChange={(event) => updateForm('stockStatus', event.target.value as ProductStockStatus)}
                  className="h-[50px] min-w-[220px] rounded-md border border-zinc-200 bg-white px-4 py-3 outline-none focus:border-red-700"
                >
                  {Object.entries(stockStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-zinc-700">
                Ordem
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => updateForm('sortOrder', event.target.value)}
                  className="h-[50px] min-w-0 rounded-md border border-zinc-200 px-4 py-3 outline-none focus:border-red-700"
                />
              </label>

              <div className="grid gap-2 text-sm font-bold text-zinc-700">
                Visibilidade
                <div className="flex min-h-[50px] flex-wrap items-center gap-5 rounded-md border border-zinc-200 bg-white px-4 py-3">
                  <label className="flex items-center gap-2 whitespace-nowrap text-sm font-bold text-zinc-700">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => updateForm('isActive', event.target.checked)}
                      className="h-4 w-4 accent-red-700"
                    />
                    Ativo
                  </label>
                  <label className="flex items-center gap-2 whitespace-nowrap text-sm font-bold text-zinc-700">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(event) => updateForm('isFeatured', event.target.checked)}
                      className="h-4 w-4 accent-red-700"
                    />
                    Destaque
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#24180f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <RefreshCw size={17} className="animate-spin" /> : <Plus size={17} />}
              {editingProductId ? 'Guardar alterações' : 'Criar produto'}
            </button>
              </div>
            </div>
          )}
        </form>

        <div className="space-y-5">
          <div className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex rounded-md bg-zinc-100 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className={`rounded-md px-4 py-2 text-sm font-black uppercase tracking-wide transition ${activeTab === 'products' ? 'bg-[#24180f] text-white' : 'text-zinc-600 hover:text-[#24180f]'}`}
                  >
                    Produtos
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className={`rounded-md px-4 py-2 text-sm font-black uppercase tracking-wide transition ${activeTab === 'orders' ? 'bg-[#24180f] text-white' : 'text-zinc-600 hover:text-[#24180f]'}`}
                  >
                    Pedidos
                  </button>
                </div>

                {activeTab === 'products' && (
                  <div className="relative min-w-0 flex-1 lg:max-w-sm">
                    <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="w-full rounded-md border border-zinc-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-red-700"
                      placeholder="Pesquisar produtos..."
                    />
                  </div>
                )}
              </div>

              {activeTab === 'orders' && (
                <div className="border-t border-zinc-100 pt-4">
                  <div className="grid gap-4">
                    <label className="grid gap-2 text-sm font-bold text-zinc-700">
                      Pesquisar pedidos
                      <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          className="h-[48px] w-full rounded-md border border-zinc-200 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-red-700"
                          placeholder="Digite o nome do comprador, telefone, email, produto ou tamanho..."
                        />
                      </div>
                    </label>

                    <div className="grid gap-3 lg:grid-cols-[260px_1fr] lg:items-end">
                      <label className="grid gap-2 text-sm font-bold text-zinc-700">
                        Estado do pedido
                        <div className="relative">
                          <select
                            value={orderStatusFilter}
                            onChange={(event) => setOrderStatusFilter(event.target.value as OrderFilter)}
                            className="h-[46px] w-full appearance-none rounded-md border border-zinc-200 bg-white px-4 pr-10 text-sm font-bold outline-none transition focus:border-red-700"
                          >
                            {(Object.keys(orderFilterLabels) as OrderFilter[]).map((filter) => (
                              <option key={filter} value={filter}>
                                {orderFilterLabels[filter]}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        </div>
                      </label>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => exportOrders('csv')}
                          disabled={filteredOrders.length === 0}
                          className="inline-flex h-[46px] items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-xs font-black uppercase tracking-wide text-[#24180f] transition hover:border-red-700 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <FileDown size={16} />
                          CSV
                        </button>
                        <button
                          type="button"
                          onClick={() => exportOrders('xls')}
                          disabled={filteredOrders.length === 0}
                          className="inline-flex h-[46px] items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#24180f] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <FileDown size={16} />
                          XLS
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-xs font-semibold text-zinc-500">
                    Pesquise pelo nome do comprador ou por outros dados do pedido. Os relatórios exportam apenas os resultados filtrados.
                  </p>
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-sm border border-zinc-200 bg-white p-8 text-center text-sm font-bold text-zinc-500 shadow-sm">
              A carregar loja...
            </div>
          ) : activeTab === 'products' ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredProducts.map((product) => (
                <article key={product.id} className="rounded-sm border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-5 md:flex-row">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-[#24180f] p-3">
                      {(product.image_urls?.[0] ?? product.image_url) ? (
                        <img src={product.image_urls?.[0] ?? product.image_url ?? ''} alt={product.name} className="h-full w-full object-contain" />
                      ) : (
                        <ImagePlus className="text-white/50" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
                          {product.category}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
                          {stockStatusLabels[product.stock_status]}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${product.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl font-black text-[#24180f]">{product.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{product.description}</p>
                      <p className="mt-3 text-sm font-black text-red-700">{formatCurrency(product.price, product.price_label)}</p>
                      <p className="mt-2 text-xs font-bold text-zinc-500">Tamanhos: {product.sizes?.join(', ') || 'Único'}</p>
                      <p className="mt-1 text-xs font-bold text-zinc-500">Media: {(product.image_urls?.length ?? (product.image_url ? 1 : 0))} imagem(ns) · {(product.video_urls?.length ?? 0)} vídeo(s)</p>
                    </div>

                    <div className="flex flex-row gap-2 md:flex-col">
                      <button
                        type="button"
                        onClick={() => editProduct(product)}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-xs font-black uppercase tracking-wide text-zinc-700 hover:border-red-700 hover:text-red-700"
                      >
                        <Pencil size={15} />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleProductActive(product)}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-xs font-black uppercase tracking-wide text-zinc-700 hover:border-red-700 hover:text-red-700"
                      >
                        <CheckCircle size={15} />
                        {product.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product)}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-700 hover:bg-red-700 hover:text-white"
                      >
                        <Trash2 size={15} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {filteredProducts.length === 0 && (
                <div className="rounded-sm border border-dashed border-zinc-300 bg-white p-8 text-center text-sm font-bold text-zinc-500">
                  Nenhum produto encontrado.
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-sm border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-600 shadow-sm">
                A mostrar <span className="font-black text-[#24180f]">{filteredOrders.length}</span> pedido(s). Os pedidos entregues saem da lista ativa e ficam disponíveis apenas em <strong>Entregues / consulta</strong> ou <strong>Todos os pedidos</strong>.
              </div>

              {filteredOrders.map((order) => {
                const orderItems = getOrderItems(order);
                const memberNumber = getOrderMemberNumber(order);
                const isReadOnly = order.status === 'entregue';
                const orderNumber = getOrderNumber(order);
                const isExpanded = expandedOrderIds.includes(order.id);

                return (
                  <article key={order.id} className={`overflow-hidden rounded-sm border bg-white shadow-sm ${isReadOnly ? 'border-zinc-200 opacity-90' : 'border-zinc-200'}`}>
                    <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${getStatusTone(order.status)}`}>
                              {orderStatusLabels[order.status]}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-600">
                              {formatDate(order.created_at)}
                            </span>
                            <span className="rounded-full bg-[#24180f] px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                              {orderNumber}
                            </span>
                            {isReadOnly && (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700">
                                Apenas consulta
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
                            <h3 className="text-xl font-black text-[#24180f]">
                              {orderItems.length} produto{orderItems.length === 1 ? '' : 's'} no pedido
                            </h3>
                            <span className="hidden text-zinc-300 md:inline">•</span>
                            <p className="text-sm font-bold text-zinc-600">
                              {order.customer_name} · {order.phone}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <button
                            type="button"
                            onClick={() => toggleOrderDetails(order.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-zinc-700 transition hover:border-red-700 hover:text-red-700"
                          >
                            {isExpanded ? 'Recolher detalhes' : 'Ver detalhes'}
                            <ChevronDown size={16} className={`transition ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          <div className="w-full sm:w-64">
                            {isReadOnly ? (
                              <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-600">
                                Pedido entregue
                              </div>
                            ) : (
                              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                                Estado
                                <div className="relative">
                                  <select
                                    value={order.status}
                                    onChange={(event) => updateOrderStatus(order, event.target.value as OrderStatus)}
                                    className="w-full appearance-none rounded-md border border-zinc-200 bg-white px-4 py-3 pr-10 text-sm font-bold normal-case tracking-normal text-zinc-700 outline-none focus:border-red-700"
                                  >
                                    {Object.entries(orderStatusLabels).map(([value, label]) => (
                                      <option key={value} value={value}>{label}</option>
                                    ))}
                                  </select>
                                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                </div>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isExpanded && (
                      <div className="grid gap-4 p-5 xl:grid-cols-[1fr_220px]">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-sm border border-zinc-100 bg-white p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Cliente</p>
                            <p className="mt-1 text-sm font-black text-[#24180f]">{order.customer_name}</p>
                            <p className="mt-1 text-sm font-bold text-zinc-600">{order.phone}</p>
                            {memberNumber && (
                              <p className="mt-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-red-700">
                                Sócio n.º {memberNumber}
                              </p>
                            )}
                          </div>
                          <div className="rounded-sm border border-zinc-100 bg-white p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Artigos</p>
                            <p className="mt-1 text-sm font-black text-[#24180f]">{orderItems.length} produto{orderItems.length === 1 ? '' : 's'}</p>
                            <p className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-500">
                              {orderItems.map((item) => getOrderItemName(item)).join(' · ')}
                            </p>
                          </div>
                          <div className="rounded-sm border border-zinc-100 bg-white p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Pagamento</p>
                            <p className="mt-1 text-sm font-black text-[#24180f]">{paymentMethodLabels[order.payment_method]}</p>
                            <p className="mt-1 text-sm font-semibold text-zinc-500">{deliveryMethodLabels[order.delivery_method]}</p>
                          </div>
                        </div>

                        <aside className="rounded-sm bg-[#24180f] p-5 text-white xl:self-start">
                          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-200">Total</p>
                          <p className="mt-3 text-xl font-black leading-tight text-white">{getOrderTotalLabel(order)}</p>
                        </aside>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_220px]">
                        <div className="min-w-0">
                          <div className="grid gap-3 rounded-sm border border-zinc-100 bg-white p-4 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Cliente</p>
                              <p className="mt-1 text-sm font-black text-[#24180f]">{order.customer_name}</p>
                              <p className="mt-1 text-sm font-bold text-zinc-600">{order.phone}</p>
                              {order.email && <p className="mt-1 break-all text-sm font-semibold text-zinc-500">{order.email}</p>}
                              {memberNumber && (
                                <p className="mt-3 inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-red-700">
                                  Sócio n.º {memberNumber}
                                </p>
                              )}
                            </div>

                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Pagamento e entrega</p>
                              <p className="mt-1 text-sm font-black text-[#24180f]">{paymentMethodLabels[order.payment_method]}</p>
                              <p className="mt-1 text-sm font-semibold text-zinc-500">{deliveryMethodLabels[order.delivery_method]}</p>
                            </div>
                          </div>

                          {order.notes && (
                            <div className="mt-5 rounded-sm border border-zinc-100 bg-white p-4">
                              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Observações / validação</p>
                              <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-zinc-600">{order.notes}</p>
                            </div>
                          )}

                          <div className="mt-5 overflow-hidden rounded-sm border border-zinc-100 bg-white">
                            <div className="flex items-center justify-between gap-3 bg-zinc-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                              <span>Produtos do pedido</span>
                              <span>{orderItems.length} artigo{orderItems.length === 1 ? '' : 's'}</span>
                            </div>

                            <div className="divide-y divide-zinc-100">
                              {orderItems.map((item, index) => (
                                <div
                                  key={`${order.id}-${index}`}
                                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="whitespace-normal text-sm font-black leading-5 text-[#24180f]">
                                      {getOrderItemName(item)}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600">
                                        Tamanho: {item.size || 'Único'}
                                      </span>
                                      <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-red-700">
                                        Qtd: {item.quantity ?? 1}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <aside className="rounded-sm bg-[#24180f] p-5 text-white xl:self-start">
                          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-200">Total</p>
                          <p className="mt-3 text-2xl font-black leading-tight text-white">{getOrderTotalLabel(order)}</p>
                          <p className="mt-4 text-xs font-semibold leading-6 text-zinc-300">
                            {isReadOnly
                              ? 'Pedido entregue e disponível apenas para consulta e relatórios.'
                              : 'Confirma o pagamento e atualiza o estado do pedido quando necessário.'}
                          </p>
                        </aside>
                      </div>
                    )}
                  </article>
                );
              })}

              {filteredOrders.length === 0 && (
                <div className="rounded-sm border border-dashed border-zinc-300 bg-white p-8 text-center text-sm font-bold text-zinc-500">
                  Nenhum pedido encontrado.
                </div>
              )}
            </div>
          )}
        </div>
      </div>    </div>
  );
}
