import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Dashboard.css';

const categories = [
  { name: 'Characters', icon: '◉', description: 'Bring your cast to life' },
  { name: 'Props', icon: '⬡', description: 'The details that make a scene' },
  { name: 'Environments', icon: '▧', description: 'Build a world around them' },
  { name: 'HDRIs', icon: '◌', description: 'Light every angle' },
  { name: 'Materials', icon: '◈', description: 'Give surfaces their story' },
];

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function AssetCard({ asset, index }) {
  const startingPrice = Math.min(...asset.licenseTiers.map((tier) => tier.price));

  return (
    <article className={`asset-card asset-card-${index % 4}`}>
      <div className="asset-visual">
        <img
          src={asset.thumbnailImage}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
        <span className="asset-category">{asset.category}</span>
        <span className="asset-polycount">{Number(asset.polycount).toLocaleString('en-IN')} tris</span>
      </div>
      <div className="asset-card-copy">
        <div className="asset-title-row">
          <h3>{asset.title}</h3>
          <span className="asset-price">{money.format(startingPrice)}</span>
        </div>
        <p>by {asset.creator?.fullName || 'PolyVault creator'}</p>
        <div className="asset-formats">
          {asset.fileFormats.slice(0, 3).map((format) => (
            <span key={format}>.{format.toUpperCase()}</span>
          ))}
          {asset.previewModelUrl && <span className="preview-label">3D PREVIEW</span>}
        </div>
      </div>
    </article>
  );
}

function AssetSkeleton() {
  return (
    <div className="asset-grid" aria-label="Loading assets">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="asset-skeleton" key={index}>
          <div className="skeleton-image" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-line-short" />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { customer, logout, becomeCreator } = useAuth();
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [creatorBusy, setCreatorBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/assets', {
        params: { limit: 8, ...filters },
      });
      setAssets(data.assets);
      setTotal(data.pagination.total);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not load the marketplace right now.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  async function handleLogout() {
    try {
      await logout();
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || 'Could not log out. Please try again.');
    }
  }

  async function handleBecomeCreator() {
    setCreatorBusy(true);
    setNotice('');
    try {
      await becomeCreator();
      setNotice('Creator access is ready. Creator listing tools are coming next.');
    } catch (requestError) {
      setNotice(requestError.response?.data?.message || 'Could not enable creator access.');
    } finally {
      setCreatorBusy(false);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setFilters((current) => ({
      ...current,
      search: search.trim() || undefined,
    }));
  }

  function selectCategory(category) {
    setFilters((current) => ({
      ...current,
      category: current.category === category ? undefined : category,
    }));
  }

  const greetingName = customer.fullName.trim().split(/\s+/)[0];

  return (
    <div className="marketplace">
      <header className="market-header">
        <Link className="brand" to="/dashboard" aria-label="PolyVault home">
          POLY<span>VAULT</span>
        </Link>
        <nav className="market-nav" aria-label="Main navigation">
          <a className="market-nav-active" href="#discover">Discover</a>
          <a href="#categories">Categories</a>
        </nav>
        <div className="account-menu-wrap">
          <button
            className="account-trigger"
            aria-expanded={menuOpen}
            aria-label="Open account menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="account-avatar">{greetingName.charAt(0).toUpperCase()}</span>
            <span className="account-name">{greetingName}</span>
            <span className="account-chevron">⌄</span>
          </button>
          {menuOpen && (
            <div className="account-menu">
              <Link to="/profile">Account &amp; creator access</Link>
              <button onClick={handleLogout}>Log out</button>
            </div>
          )}
        </div>
      </header>

      <main className="market-main">
        <section className="welcome-strip">
          <p>GOOD TO SEE YOU, {greetingName.toUpperCase()}</p>
          <span>{customer.isCreator ? 'BUYER + CREATOR' : 'CREATOR-READY MARKETPLACE'}</span>
        </section>

        <section className="market-hero" id="discover">
          <div className="hero-copy">
            <p className="eyebrow">YOUR NEXT CREATION STARTS HERE</p>
            <h1>Find the pieces<br />that make it <em>real.</em></h1>
            <p className="hero-description">
              Explore production-ready 3D assets from independent artists, made for whatever you imagine next.
            </p>
            <form className="market-search" onSubmit={submitSearch} role="search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                aria-label="Search 3D assets"
                placeholder="Search characters, props, worlds..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button type="submit">Search <span>→</span></button>
            </form>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-cube"><span /><i /><b /></div>
            <div className="hero-art-caption"><span>01 / 05</span><span>IMAGINATION, ASSET-IZED</span></div>
          </div>
          <div className="hero-index">PV—001</div>
        </section>

        <section className="dashboard-stats" aria-label="Marketplace overview">
          <div><strong>{loading ? '—' : total.toLocaleString('en-IN')}</strong><span>assets in this view</span></div>
          <div><strong>05</strong><span>creative categories</span></div>
          <div><strong>{customer.isCreator ? 'ON' : 'OPEN'}</strong><span>{customer.isCreator ? 'creator access' : 'creator access'}</span></div>
          <p>Made for artists.<br /><span>Ready for your next idea.</span></p>
        </section>

        <section className="category-section" id="categories">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PICK YOUR STARTING POINT</p>
              <h2>Explore by category</h2>
            </div>
            <button
              className="text-button"
              onClick={() => {
                setFilters({});
                setSearch('');
              }}
            >
              Clear filters <span>↗</span>
            </button>
          </div>
          <div className="category-grid">
            {categories.map((category, index) => (
              <button
                className={`category-tile category-tile-${index} ${filters.category === category.name ? 'category-selected' : ''}`}
                key={category.name}
                aria-pressed={filters.category === category.name}
                onClick={() => selectCategory(category.name)}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
                <span className="category-description">{category.description}</span>
                <span className="category-arrow">↗</span>
              </button>
            ))}
          </div>
        </section>

        <section className="asset-section" id="asset-grid">
          <div className="section-heading asset-section-heading">
            <div>
              <p className="eyebrow">{filters.category ? 'A GOOD PLACE TO START' : 'FRESH FROM THE COMMUNITY'}</p>
              <h2>{filters.category || 'Discover assets'}</h2>
            </div>
            <span className="result-count">{loading ? 'Loading…' : `${total} ${total === 1 ? 'asset' : 'assets'}`}</span>
          </div>

          {notice && <p className="dashboard-notice" role="status">{notice}</p>}
          {loading && <AssetSkeleton />}
          {!loading && error && (
            <div className="catalog-state catalog-error" role="alert">
              <span className="state-mark">!</span>
              <h3>Something interrupted the search.</h3>
              <p>{error}</p>
              <button className="button button-quiet" onClick={loadAssets}>Try again</button>
            </div>
          )}
          {!loading && !error && assets.length === 0 && (
            <div className="catalog-state catalog-empty">
              <span className="state-mark">◇</span>
              <p className="eyebrow">THE FIRST PIECE IS YOURS</p>
              <h3>{filters.search || filters.category ? 'No assets match this search yet.' : 'A fresh canvas, ready for creators.'}</h3>
              <p>
                {filters.search || filters.category
                  ? 'Try another phrase or category, or clear the filters to see everything available.'
                  : 'There are no published assets yet. Creator listings will appear here as soon as they are published.'}
              </p>
              {filters.search || filters.category ? (
                <button className="button button-quiet" onClick={() => { setFilters({}); setSearch(''); }}>
                  Show all assets
                </button>
              ) : !customer.isCreator ? (
                <button className="button button-primary creator-cta" onClick={handleBecomeCreator} disabled={creatorBusy}>
                  {creatorBusy ? 'Setting up…' : 'Become a creator'} <span>→</span>
                </button>
              ) : (
                <Link className="button button-primary creator-cta" to="/profile">
                  View creator access <span>→</span>
                </Link>
              )}
            </div>
          )}
          {!loading && !error && assets.length > 0 && (
            <div className="asset-grid">
              {assets.map((asset, index) => <AssetCard key={asset._id} asset={asset} index={index} />)}
            </div>
          )}
        </section>

        <section className="creator-banner">
          <div className="creator-banner-mark" aria-hidden="true">P<span>V</span></div>
          <div>
            <p className="eyebrow">BUILT FOR THE PEOPLE WHO BUILD WORLDS</p>
            <h2>Your work belongs out there.</h2>
            <p>Make room for your next idea—and let the community discover what you create.</p>
          </div>
          {customer.isCreator ? (
            <Link to="/profile" className="banner-link">Your creator profile <span>→</span></Link>
          ) : (
            <button className="banner-link" onClick={handleBecomeCreator} disabled={creatorBusy}>
              {creatorBusy ? 'One moment…' : 'Start creating'} <span>→</span>
            </button>
          )}
        </section>
      </main>

      <footer className="market-footer">
        <Link className="brand" to="/dashboard">POLY<span>VAULT</span></Link>
        <span>Good assets. Bigger ideas.</span>
        <Link to="/profile">Account settings</Link>
      </footer>
    </div>
  );
}
