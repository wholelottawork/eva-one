import { useEffect } from 'react'

const _newsCache = new Map<string, { data: unknown; ts: number }>()
async function cachedFetch(
  key: string[],
  fetcher: () => Promise<unknown>,
  ttl: number
): Promise<unknown> {
  const k = key.join(':')
  const cached = _newsCache.get(k)
  if (cached && Date.now() - cached.ts < ttl) return cached.data
  const data = await fetcher()
  _newsCache.set(k, { data, ts: Date.now() })
  return data
}
function clearNewsCache() {
  for (const key of Array.from(_newsCache.keys())) {
    if (key.startsWith('news:')) _newsCache.delete(key)
  }
}

export function NewsPage() {
  useEffect(() => {
    const R2J = 'https://api.rss2json.com/v1/api.json?rss_url='
    const SOURCES = [
      { id:'ct', name:'CoinTelegraph', type:'proxy', url:'/ctnews/rss', color:'#50d2c1' },
      { id:'cd', name:'CoinDesk', type:'proxy', url:'/cdnews/arc/outboundfeeds/rss/', color:'#f7931a' },
      { id:'dec', name:'Decrypt', type:'proxy', url:'/decnews/feed', color:'#7b68ee' },
      { id:'blk', name:'CryptoSlate', type:'r2j', url:R2J + encodeURIComponent('https://cryptoslate.com/feed/'), color:'#3498db' },
      { id:'bwk', name:'Blockworks', type:'r2j', url:R2J + encodeURIComponent('https://blockworks.co/feed'), color:'#e74c3c' },
      { id:'btcm', name:'Bitcoin Mag', type:'proxy', url:'/btcmnews/feed', color:'#f39c12' },
      { id:'bein', name:'BeInCrypto', type:'proxy', url:'/beinnews/feed/', color:'#27ae60' },
      { id:'btci', name:'Bitcoinist', type:'proxy', url:'/btcinews/feed/', color:'#9b59b6' },
    ]
    const CATS = [
      { id:'all', label:'All', kw:[] as string[] },
      { id:'bitcoin', label:'Bitcoin', kw:['bitcoin','btc'] },
      { id:'ethereum', label:'Ethereum', kw:['ethereum','eth'] },
      { id:'solana', label:'Solana', kw:['solana','sol'] },
      { id:'defi', label:'DeFi', kw:['defi','decentralized finance','yield','amm'] },
      { id:'altcoins', label:'Altcoins', kw:['altcoin','altcoins','xrp','cardano','polygon','avalanche'] },
      { id:'regulation', label:'Regulation', kw:['regulation','sec','cftc','legal','compliance','congress','ban'] },
    ]
    const PAGE_SIZE = 18
    let allArticles: unknown[] = []
    let cacheLoaded = false
    let activeCat = CATS[0]
    let activeSrcIds = new Set(SOURCES.map(s => s.id))
    let shown = 0
    let loading = false
    let visibleArticles: unknown[] = []

    const el = (id: string) => document.getElementById(id)
    const set = (id: string, v: string) => { const e = el(id); if (e) e.textContent = v }

    function timeAgo(dateStr: string) {
      const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
      if (d < 60) return d + 's ago'
      if (d < 3600) return Math.floor(d / 60) + 'm ago'
      if (d < 86400) return Math.floor(d / 3600) + 'h ago'
      return Math.floor(d / 86400) + 'd ago'
    }

    function getText(item: Element, tagName: string) {
      const node = item.getElementsByTagName(tagName)[0]
      return (node as Element & {textContent?: string})?.textContent?.trim() || ''
    }

    function upgradeImageUrl(url: string) {
      if (!url) return url
      // CoinTelegraph CDN
      if (url.includes('images.cointelegraph.com'))
        url = url.replace(/\/images\/\d+_/, '/images/1600_')
      // Cloudinary (CoinDesk, others)
      if (url.includes('cloudinary.com')) {
        url = url.replace(/\/w_\d+,h_\d+[^/]*/, '/w_1600,h_900,c_fill,f_auto,q_auto')
        url = url.replace(/\/w_\d+(?=[,/]|$)/, '/w_1600')
      }
      // Sanity CDN (CoinDesk)
      if (url.includes('cdn.sanity.io')) {
        if (url.includes('?')) {
          url = url.replace(/([?&]w=)\d+/, (_m: string, p: string) => p + '1600')
          url = url.replace(/([?&]h=)\d+/, (_m: string, p: string) => p + '900')
          if (!url.includes('auto=')) url += '&auto=format'
          if (!url.includes('fit=')) url += '&fit=max'
        } else {
          url += '?w=1600&auto=format&fit=max'
        }
      }
      // imgix CDN (Blockworks, Bitcoin Magazine, others)
      if (url.includes('imgix.net') || url.includes('.imgix.')) {
        url = url.replace(/([?&]w=)\d+/, (_m: string, p: string) => p + '1600')
        if (!url.includes('?')) url += '?w=1600&auto=format&q=85'
        else if (!url.includes('w=')) url += '&w=1600'
        if (!url.includes('auto=')) url += '&auto=format'
      }
      // WordPress thumbnail suffixes (-800x450 etc.) — strip to get original full-res
      if (!url.includes('cdn.sanity.io') && !url.includes('imgix')) {
        url = url.replace(/(-\d{2,4}x\d{2,4})(\.[a-zA-Z0-9]{2,5})(\?|$)/, '$2$3')
      }
      // Generic query-param resizing
      url = url.replace(/([?&]w=)\d+/, (_m: string, p: string) => p + '1600')
      url = url.replace(/([?&]width=)\d+/, (_m: string, p: string) => p + '1600')
      url = url.replace(/([?&]resize=)\d+,\d+/, (_m: string, p: string) => p + '1600,900')
      url = url.replace(/([?&]quality=)\d+/, (_m: string, p: string) => p + '90')
      return url
    }

    type Article = {title:string,link:string,pubDate:string,desc:string,img:string,cats:string[],sourceId:string,source:string,sourceColor:string}
    type Source = {id:string,name:string,type:string,url:string,color:string}

    function parseRSS(xmlText: string, source: Source): Article[] {
      const doc = new DOMParser().parseFromString(xmlText, 'text/xml')
      const items = doc.querySelectorAll('item')
      return Array.from(items).map(item => {
        let img = ''
        const allMC = Array.from(item.getElementsByTagName('media:content'))
          .filter(n => {
            const med = n.getAttribute('medium') || ''
            const u = n.getAttribute('url') || ''
            return med === 'image' || !med || /\.(jpe?g|png|gif|webp)/i.test(u)
          })
          .sort((a, b) => (parseInt(b.getAttribute('width') || '0') || 0) - (parseInt(a.getAttribute('width') || '0') || 0))
        const mc = allMC[0] || item.getElementsByTagName('media:thumbnail')[0]
        if (mc) img = mc.getAttribute('url') || mc.getAttribute('href') || ''
        if (!img) {
          const enc = item.getElementsByTagName('enclosure')[0]
          if (enc && /image/i.test(enc.getAttribute('type') || '')) img = enc.getAttribute('url') || ''
        }
        if (!img) {
          const desc = getText(item, 'description')
          const m = desc.match(/<img[^>]+src=["']([^"']+)/i)
          if (m) img = m[1]
        }
        img = upgradeImageUrl(img)
        const cats = Array.from(item.getElementsByTagName('category')).map(c => c.textContent?.trim()).filter(Boolean) as string[]
        const desc = getText(item, 'description').replace(/<[^>]*>/g, '').trim()
        return {
          title: getText(item, 'title'),
          link: getText(item, 'link'),
          pubDate: getText(item, 'pubDate'),
          desc,
          img,
          cats: cats.slice(0, 3),
          sourceId: source.id,
          source: source.name,
          sourceColor: source.color,
        }
      })
    }

    function skeletons(n: number) {
      return Array.from({ length: n }, () => `
<div class="bg-[#0d0d0d] border border-[#1f1f1f] rounded-md overflow-hidden">
<div class="w-full aspect-[16/7] bg-[#161616] animate-pulse"></div>
<div class="px-3.5 py-3 flex flex-col gap-2">
<div class="rounded-sm bg-[#161616] animate-pulse" style="width:50%;height:8px"></div>
<div class="rounded-sm bg-[#161616] animate-pulse" style="width:100%;height:11px;margin-top:2px"></div>
<div class="rounded-sm bg-[#161616] animate-pulse" style="width:85%;height:11px"></div>
<div class="rounded-sm bg-[#161616] animate-pulse" style="width:60%;height:11px"></div>
<div class="rounded-sm bg-[#161616] animate-pulse" style="width:40%;height:8px;margin-top:4px"></div>
</div>
</div>`).join('')
    }

    function articleCard(a: Article) {
      const link = a.link.replace(/'/g, "&#39;")
      return `<div class="article bg-[#0d0d0d] border border-[#1f1f1f] rounded-md overflow-hidden flex flex-col cursor-pointer transition-colors duration-150 hover:border-[#50d2c1] group" onclick="window.open('${link}','_blank','noopener')">
<div class="w-full aspect-[16/7] overflow-hidden bg-[#161616] shrink-0">
${a.img
  ? `<img class="w-full h-full object-cover block transition-transform duration-300 group-hover:scale-[1.03]" src="${a.img}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-[28px] text-[#878c8f]\\'>📰</div>'">`
  : '<div class="w-full h-full flex items-center justify-center text-[28px] text-[#878c8f]">📰</div>'}
</div>
<div class="px-3.5 py-3 flex-1 flex flex-col gap-[7px]">
<div class="flex justify-between items-center gap-1.5">
<span class="text-[10px] font-bold uppercase tracking-wider overflow-hidden text-ellipsis whitespace-nowrap" style="color:${a.sourceColor}">${a.source}</span>
<span class="text-[10px] text-[#878c8f] whitespace-nowrap shrink-0">${a.pubDate ? timeAgo(a.pubDate) : ''}</span>
</div>
<div class="text-[13px] font-semibold leading-[1.45] text-white transition-colors duration-150 group-hover:text-[#50d2c1] line-clamp-3">${a.title}</div>
${a.desc ? `<div class="text-[11px] text-[#878c8f] leading-[1.5] line-clamp-2">${a.desc.slice(0, 200)}</div>` : ''}
${a.cats.length ? `<div class="flex flex-wrap gap-1 mt-0.5">${a.cats.map(c => `<span class="text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-[#161616] text-[#878c8f] uppercase tracking-wide">${c}</span>`).join('')}</div>` : ''}
</div>
</div>`
    }

    function parseR2J(data: {items?:{title?:string,link?:string,pubDate?:string,description?:string,thumbnail?:string,categories?:string[]}[]}, source: Source): Article[] {
      return (data.items || []).map(item => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        desc: (item.description || '').replace(/<[^>]*>/g, '').trim(),
        img: upgradeImageUrl(item.thumbnail || ''),
        cats: (item.categories || []).slice(0, 3),
        sourceId: source.id,
        source: source.name,
        sourceColor: source.color,
      }))
    }

    async function fetchAll() {
      if (cacheLoaded) return allArticles
      const results = await Promise.allSettled(
        SOURCES.map(s =>
          cachedFetch(['news', s.id], () => {
            if (s.type === 'r2j') {
              return fetch(s.url)
                .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
                .then((data: {status?:string,message?:string,items?:unknown[]}) => {
                  if (data.status !== 'ok') throw new Error(data.message)
                  return parseR2J(data as Parameters<typeof parseR2J>[0], s)
                })
            }
            return fetch(s.url)
              .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.text() })
              .then(xml => parseRSS(xml, s))
          }, 120_000)
        )
      )
      const loaded: Article[] = [], failed: string[] = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') loaded.push(...(r.value as Article[]))
        else failed.push(SOURCES[i].name)
      })
      loaded.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      const seen = new Set<string>()
      allArticles = loaded.filter(a => {
        const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      cacheLoaded = true
      const statusEl = el('feed-status')
      if (statusEl) {
        const ok = SOURCES.length - failed.length
        statusEl.innerHTML = `<span class="text-[#50d2c1]">${ok}</span>/${SOURCES.length} sources loaded · ${allArticles.length} articles` +
          (failed.length ? ` · failed: ${failed.join(', ')}` : '')
      }
      return allArticles
    }

    function applyFilters(articles: unknown[]) {
      let result = articles as Article[]
      if (activeCat.kw.length) {
        const kw = activeCat.kw
        result = result.filter(a => {
          const text = (a.title + ' ' + a.desc + ' ' + a.cats.join(' ')).toLowerCase()
          return kw.some(k => text.includes(k))
        })
      }
      if (activeSrcIds.size < SOURCES.length) {
        result = result.filter(a => activeSrcIds.has(a.sourceId))
      }
      return result
    }

    function render(filtered: Article[]) {
      visibleArticles = filtered
      shown = 0
      const next = Math.min(PAGE_SIZE, visibleArticles.length)
      const grid = el('news-grid')
      if (!grid) return
      if (!visibleArticles.length) {
        grid.innerHTML = `<div class="col-span-full py-[60px] px-5 text-center text-[#878c8f] text-xs"><div class="text-[32px] mb-2.5">📭</div><div>No articles found.</div></div>`
        const lmw = el('load-more-wrap'); if (lmw) lmw.style.display = 'none'
        return
      }
      grid.innerHTML = (visibleArticles as Article[]).slice(0, next).map(articleCard).join('')
      shown = next
      const lmw = el('load-more-wrap')
      if (lmw) lmw.style.display = shown < visibleArticles.length ? 'block' : 'none'
    }

    function showMore() {
      const next = Math.min(shown + PAGE_SIZE, visibleArticles.length)
      const grid = el('news-grid')
      if (grid) grid.innerHTML = (visibleArticles as Article[]).slice(0, next).map(articleCard).join('')
      shown = next
      const lmw = el('load-more-wrap')
      if (lmw) lmw.style.display = shown < visibleArticles.length ? 'block' : 'none'
    }

    async function load() {
      if (loading) return
      loading = true
      const grid = el('news-grid'); if (grid) grid.innerHTML = skeletons(9)
      const lmw = el('load-more-wrap'); if (lmw) lmw.style.display = 'none'
      const btn = el('refresh-btn'); if (btn) (btn as HTMLButtonElement).disabled = true
      try {
        const all = await fetchAll()
        set('update-ts', 'Updated ' + new Date().toLocaleTimeString())
        render(applyFilters(all))
      } catch (e: unknown) {
        const grid2 = el('news-grid')
        if (grid2) grid2.innerHTML = `<div class="col-span-full py-[60px] px-5 text-center text-[#878c8f] text-xs"><div class="text-[32px] mb-2.5">⚠️</div><div>Failed to load: ${(e as Error).message}</div></div>`
      }
      if (btn) (btn as HTMLButtonElement).disabled = false
      loading = false
    }

    async function refresh() {
      cacheLoaded = false; allArticles = []
      clearNewsCache()
      const fs = el('feed-status'); if (fs) fs.textContent = ''
      await load()
    }

    function buildFilters() {
      const catFilters = el('cat-filters')
      if (catFilters) {
        catFilters.innerHTML = CATS.map(c =>
          `<button class="filter-btn${c.id === activeCat.id ? ' active' : ''}" data-id="${c.id}">${c.label}</button>`
        ).join('')
        catFilters.addEventListener('click', e => {
          const btn = (e.target as Element).closest('.filter-btn') as HTMLElement
          if (!btn || loading) return
          const cat = CATS.find(c => c.id === btn.dataset.id)
          if (!cat || cat.id === activeCat.id) return
          activeCat = cat
          document.querySelectorAll('#cat-filters .filter-btn').forEach(b => b.classList.toggle('active', (b as HTMLElement).dataset.id === cat.id))
          render(applyFilters(allArticles))
        })
      }

      const srcFilters = el('src-filters')
      if (srcFilters) {
        srcFilters.innerHTML = SOURCES.map(s =>
          `<button class="src-btn-news active" data-sid="${s.id}">${s.name}</button>`
        ).join('')
        srcFilters.addEventListener('click', e => {
          const btn = (e.target as Element).closest('.src-btn-news') as HTMLElement
          if (!btn) return
          const sid = btn.dataset.sid || ''
          if (activeSrcIds.has(sid)) {
            if (activeSrcIds.size === 1) return
            activeSrcIds.delete(sid)
            btn.classList.remove('active')
          } else {
            activeSrcIds.add(sid)
            btn.classList.add('active')
          }
          render(applyFilters(allArticles))
        })
      }
    }

    ;(window as Window & { refresh?: () => void; showMore?: () => void }).refresh = refresh
    ;(window as Window & { refresh?: () => void; showMore?: () => void }).showMore = showMore

    buildFilters()
    load()

    return () => {
      delete (window as Window & { refresh?: () => void; showMore?: () => void }).refresh
      delete (window as Window & { refresh?: () => void; showMore?: () => void }).showMore
    }
  }, [])

  return (
    <main className="max-w-[1200px] mx-auto px-6 pb-10 pt-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
        <h1 className="text-lg font-bold tracking-tight">Crypto News</h1>
        <div className="flex items-center gap-2.5">
          <span id="update-ts" className="text-[11px] text-[#878c8f]" />
          <button className="refresh-btn" id="refresh-btn" onClick={() => (window as Window & {refresh?:()=>void}).refresh?.()}>Refresh</button>
        </div>
      </div>
      <div className="filter-row" id="cat-filters" />
      <div className="source-row" id="src-filters" />
      <div className="feed-status text-[10px] text-[#878c8f] mb-2" id="feed-status" />
      <div className="news-grid" id="news-grid" />
      <div className="mt-5 text-center" id="load-more-wrap" style={{display:'none'}}>
        <button className="load-more-btn" onClick={() => (window as Window & {showMore?:()=>void}).showMore?.()}>Load More</button>
      </div>
    </main>
  )
}
