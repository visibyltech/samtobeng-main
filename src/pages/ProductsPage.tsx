import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

export function ProductsPage() {
  const { publishedProducts, categories, loading, needsCatalogSeed, seeding, seedOriginalCatalog } = useStore();
  const { isAdmin, loginWithGoogle } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCategory = searchParams.get('category') || '';
  const activeCondition = searchParams.get('condition') || '';
  const activeBrand = searchParams.get('brand') || '';
  const activeSort = searchParams.get('sort') || '';
  const activeAvailability = searchParams.get('availability') || '';
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const queryParam = searchParams.get('q') || '';

  const [searchInput, setSearchInput] = useState(queryParam);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  }

  function clearAllFilters() {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam('q', searchInput.trim());
  }

  const allBrands = useMemo(() => {
    const set = new Set<string>();
    for (const p of publishedProducts) {
      if (p.brand) set.add(p.brand.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [publishedProducts]);

  const filteredProducts = useMemo(() => {
    let list = [...publishedProducts];

    if (queryParam.trim()) {
      const q = queryParam.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (activeCategory) {
      list = list.filter((p) => p.category.toLowerCase() === activeCategory.toLowerCase());
    }

    if (activeCondition) {
      list = list.filter((p) => p.condition === activeCondition);
    }

    if (activeBrand) {
      list = list.filter((p) => p.brand.trim().toLowerCase() === activeBrand.trim().toLowerCase());
    }

    if (activeAvailability === 'in-stock') {
      list = list.filter((p) => p.stock > 0);
    } else if (activeAvailability === 'out-of-stock') {
      list = list.filter((p) => p.stock <= 0);
    }

    const minP = minPriceParam ? Number(minPriceParam) : null;
    const maxP = maxPriceParam ? Number(maxPriceParam) : null;
    if (minP !== null && !Number.isNaN(minP)) {
      list = list.filter((p) => p.price >= minP);
    }
    if (maxP !== null && !Number.isNaN(maxP)) {
      list = list.filter((p) => p.price <= maxP);
    }

    if (activeSort === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [
    publishedProducts,
    queryParam,
    activeCategory,
    activeCondition,
    activeBrand,
    activeAvailability,
    minPriceParam,
    maxPriceParam,
    activeSort,
  ]);

  const filterSidebar = (
    <div className="space-y-8">
      <div>
        <h3 className="font-display font-semibold text-sm mb-3">Category</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <button
              type="button"
              onClick={() => updateParam('category', '')}
              className={!activeCategory ? 'text-signal font-medium' : 'text-steel hover:text-ink'}
            >
              All categories
            </button>
          </li>
          {categories
            .filter((c) => c.active)
            .map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => updateParam('category', cat.slug)}
                  className={`capitalize ${
                    activeCategory === cat.slug
                      ? 'text-signal font-medium'
                      : 'text-steel hover:text-ink'
                  }`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
        </ul>
      </div>

      <div>
        <h3 className="font-display font-semibold text-sm mb-3">Condition</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <button
              type="button"
              onClick={() => updateParam('condition', '')}
              className={!activeCondition ? 'text-signal font-medium' : 'text-steel hover:text-ink'}
            >
              All conditions
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => updateParam('condition', 'new')}
              className={activeCondition === 'new' ? 'text-signal font-medium' : 'text-steel hover:text-ink'}
            >
              Brand New
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => updateParam('condition', 'uk-used')}
              className={activeCondition === 'uk-used' ? 'text-signal font-medium' : 'text-steel hover:text-ink'}
            >
              UK Used
            </button>
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-display font-semibold text-sm mb-3">Availability</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <button
              type="button"
              onClick={() => updateParam('availability', '')}
              className={!activeAvailability ? 'text-signal font-medium' : 'text-steel hover:text-ink'}
            >
              All stock
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => updateParam('availability', 'in-stock')}
              className={activeAvailability === 'in-stock' ? 'text-signal font-medium' : 'text-steel hover:text-ink'}
            >
              In stock only
            </button>
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-display font-semibold text-sm mb-3">Brand</h3>
        <ul className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2">
          <li>
            <button
              type="button"
              onClick={() => updateParam('brand', '')}
              className={!activeBrand ? 'text-signal font-medium' : 'text-steel hover:text-ink'}
            >
              All brands
            </button>
          </li>
          {allBrands.map((brand) => (
            <li key={brand}>
              <button
                type="button"
                onClick={() => updateParam('brand', brand)}
                className={
                  activeBrand.toLowerCase() === brand.toLowerCase()
                    ? 'text-signal font-medium'
                    : 'text-steel hover:text-ink'
                }
              >
                {brand}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-display font-semibold text-sm mb-3">Price range (₦)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={minPriceParam}
            onChange={(e) => updateParam('minPrice', e.target.value)}
            className="w-full border border-line rounded-lg px-2.5 py-1.5 text-xs font-data focus:outline-none focus:border-signal"
          />
          <span className="text-steel text-xs">-</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={maxPriceParam}
            onChange={(e) => updateParam('maxPrice', e.target.value)}
            className="w-full border border-line rounded-lg px-2.5 py-1.5 text-xs font-data focus:outline-none focus:border-signal"
          />
        </div>
      </div>

      <div>
        <h3 className="font-display font-semibold text-sm mb-3">Sort by price</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <button
              type="button"
              onClick={() => updateParam('sort', '')}
              className={!activeSort ? 'text-signal font-medium' : 'text-steel hover:text-ink'}
            >
              Featured
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => updateParam('sort', 'price-asc')}
              className={activeSort === 'price-asc' ? 'text-signal font-medium' : 'text-steel hover:text-ink'}
            >
              Low to High
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => updateParam('sort', 'price-desc')}
              className={activeSort === 'price-desc' ? 'text-signal font-medium' : 'text-steel hover:text-ink'}
            >
              High to Low
            </button>
          </li>
        </ul>
      </div>

      {(activeCategory || activeCondition || activeBrand || activeAvailability || minPriceParam || maxPriceParam || queryParam || activeSort) && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="text-xs font-medium text-signal underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <span className="text-xs font-data uppercase tracking-widest text-signal">
          Catalogue
        </span>
        <h1 className="font-display font-bold text-3xl mt-1">
          {activeCategory ? `Shop ${activeCategory}` : 'Shop all products'}
        </h1>
        <form onSubmit={handleSearchSubmit} className="mt-5 max-w-md flex gap-2">
          <input
            type="text"
            placeholder="Search laptops, phones, brands..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (e.target.value === '' && queryParam) {
                updateParam('q', '');
              }
            }}
            className="flex-1 border border-line rounded-full px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-signal"
          />
          <button
            type="submit"
            className="bg-ink text-paper px-5 py-2.5 rounded-full text-sm font-medium hover:bg-signal transition-colors"
          >
            Search
          </button>
        </form>

        <div className="mt-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="inline-flex items-center gap-2 border border-line bg-white px-4 py-2 rounded-full text-xs font-medium"
          >
            <SlidersHorizontal size={14} />
            {mobileFiltersOpen ? 'Hide Filters' : 'Filters & Sort'}
          </button>
        </div>
      </div>

      {needsCatalogSeed && (
        <div className="rounded-2xl border border-signal/30 bg-signal/5 p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-data uppercase tracking-wider text-signal font-semibold">
              Firestore Catalog Empty
            </p>
            <p className="text-sm text-ink mt-1">
              Sign in as Store Admin to migrate all 77 original SAMTOB P&amp;C products into Cloud Firestore.
            </p>
          </div>
          {isAdmin ? (
            <button
              type="button"
              disabled={seeding}
              onClick={() => seedOriginalCatalog(true)}
              className="shrink-0 bg-signal text-white px-5 py-2.5 rounded-full text-sm font-medium"
            >
              {seeding ? 'Migrating...' : 'Migrate 77 Products'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => loginWithGoogle()}
              className="shrink-0 bg-ink text-paper px-5 py-2.5 rounded-full text-sm font-medium"
            >
              Admin Sign In
            </button>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[220px_1fr] gap-10">
        <aside className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block`}>
          {filterSidebar}
        </aside>

        <div>
          <p className="text-sm text-steel mb-5 font-data">
            {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} found
          </p>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 9 }).map((_, idx) => (
                <div key={idx} className="rounded-2xl border border-line bg-white h-72 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-10 text-center">
              <p className="font-display font-semibold text-lg mb-2">No products match your filters</p>
              <p className="text-sm text-steel mb-5">
                Try clearing your search or selecting another category.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="bg-ink text-paper px-5 py-2.5 rounded-full text-sm font-medium hover:bg-signal transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
