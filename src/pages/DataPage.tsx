import { useEffect } from 'react'

const _cache = new Map<string, { data: unknown; ts: number }>()
async function cachedFetch(
  key: string[],
  fetcher: () => Promise<unknown>,
  ttl: number
): Promise<unknown> {
  const k = key.join(':')
  const cached = _cache.get(k)
  if (cached && Date.now() - cached.ts < ttl) return cached.data
  const data = await fetcher()
  _cache.set(k, { data, ts: Date.now() })
  return data
}

export function DataPage() {
  useEffect(() => {
    const SYMS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','DOTUSDT','POLUSDT','UNIUSDT','LTCUSDT','ATOMUSDT','NEARUSDT','APTUSDT','ARBUSDT','OPUSDT','INJUSDT','SUIUSDT','TIAUSDT','JUPUSDT','WIFUSDT','BONKUSDT','PEPEUSDT']
    const LABEL: Record<string,string> = {BTCUSDT:'BTC',ETHUSDT:'ETH',SOLUSDT:'SOL',BNBUSDT:'BNB',XRPUSDT:'XRP',DOGEUSDT:'DOGE',ADAUSDT:'ADA',AVAXUSDT:'AVAX',LINKUSDT:'LINK',DOTUSDT:'DOT',POLUSDT:'POL',UNIUSDT:'UNI',LTCUSDT:'LTC',ATOMUSDT:'ATOM',NEARUSDT:'NEAR',APTUSDT:'APT',ARBUSDT:'ARB',OPUSDT:'OP',INJUSDT:'INJ',SUIUSDT:'SUI',TIAUSDT:'TIA',JUPUSDT:'JUP',WIFUSDT:'WIF',BONKUSDT:'BONK',PEPEUSDT:'PEPE'}
    const CG_TTL = 70_000
    let coins: unknown[] = []
    let tickerData: Record<string,{px:number,ch:number}> = {}
    let globalData: unknown = null
    const FUT_SYMS = ['BTC','ETH','SOL','BNB','XRP']
    let futSym = 'BTC'
    let futTab = 'liqmap'
    let futData: unknown = null

    const el = (id: string) => document.getElementById(id)
    const set = (id: string, v: string) => { const e = el(id); if (e) e.textContent = v }
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

    function fmtLarge(n: number) {
      if (!isFinite(n) || n === null) return '—'
      if (n >= 1e12) return '$' + (n/1e12).toFixed(2) + 'T'
      if (n >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B'
      if (n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M'
      return '$' + n.toLocaleString('en-US')
    }
    function fmtPx(n: number) {
      if (!isFinite(n) || n === null) return '—'
      if (n >= 10000) return '$' + n.toLocaleString('en-US', {minimumFractionDigits:0,maximumFractionDigits:0})
      if (n >= 1000) return '$' + n.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2})
      if (n >= 1) return '$' + n.toFixed(4)
      if (n >= 0.001) return '$' + n.toFixed(5)
      return '$' + n.toFixed(8)
    }
    function fmtPct(v: number) { if (!isFinite(v)||v===null) return '—'; return (v>=0?'+':'')+v.toFixed(2)+'%' }
    function pCls(v: number) { return (v??0) >= 0 ? 'up' : 'dn' }
    function fmtHL(n: number) { if(!isFinite(n)||n==null)return'—';if(n>=1e9)return'$'+(n/1e9).toFixed(2)+'B';if(n>=1e6)return'$'+(n/1e6).toFixed(2)+'M';if(n>=1e3)return'$'+(n/1e3).toFixed(2)+'K';return'$'+n.toFixed(2) }

    async function cgFetch(path: string) {
      try {
        return await cachedFetch(['coingecko', path], async () => {
          const res = await fetch('/coingecko' + path)
          if (!res.ok) throw new Error('HTTP ' + res.status)
          const data = await res.json()
          if ((data as {status?: {error_code?: number}})?.status?.error_code) throw new Error('CG error')
          return data
        }, CG_TTL)
      } catch { return null }
    }

    function buildTicker() {
      const html = SYMS.map(s => `<span class="t-item t-${s}"><span class="t-sym">${LABEL[s]}</span><span class="t-px">—</span><span class="t-ch">—</span></span>`).join('')
      const tickerEl = el('ticker'); if (tickerEl) tickerEl.innerHTML = html + html
    }

    async function fetchTicker() {
      try {
        const res = await fetch(`/binance/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(SYMS))}`)
        if (!res.ok) return
        const data = await res.json()
        if (!Array.isArray(data)) return
        data.forEach((t: {symbol:string,lastPrice:string,priceChangePercent:string}) => {
          const px = parseFloat(t.lastPrice), ch = parseFloat(t.priceChangePercent)
          if (!isFinite(px)) return
          tickerData[t.symbol] = { px, ch }
          document.querySelectorAll(`.t-${t.symbol}`).forEach(item => {
            const pxEl = item.querySelector('.t-px'), chEl = item.querySelector('.t-ch')
            if (pxEl) pxEl.textContent = fmtPx(px)
            if (chEl) { chEl.textContent = ' '+fmtPct(ch); chEl.className = 't-ch '+pCls(ch) }
          })
        })
      } catch {}
    }

    function makeSpark(rawPts: number[][], color: string) {
      const step = Math.max(1, Math.floor(rawPts.length/40))
      const pts = rawPts.filter((_,i) => i%step===0)
      if (pts.length < 2) return ''
      const vals = pts.map(p=>p[1])
      const min = Math.min(...vals), max = Math.max(...vals), rng = max-min||1
      const W=120, H=44
      const px = (i:number) => (i/(pts.length-1))*W
      const py = (v:number) => H-((v-min)/rng)*H*0.8-H*0.1
      const linePts = pts.map((p,i) => `${px(i).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ')
      const lastX = px(pts.length-1).toFixed(1)
      const areaD = `M 0,${py(pts[0][1]).toFixed(1)} `+pts.slice(1).map((p,i)=>`L ${px(i+1).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ')+` L ${lastX},${H} L 0,${H} Z`
      const gId = 'sg'+Math.random().toString(36).slice(2,6)
      return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="${gId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${areaD}" fill="url(#${gId})"/><polyline points="${linePts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    }

    async function fetchSparklines() {
      try {
        const res = await fetch('/binance/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=42')
        if (!res.ok) return
        const klines = await res.json()
        const mcPts = klines.map((k:unknown[],i:number) => [i, parseFloat(k[4] as string)])
        const volPts = klines.map((k:unknown[],i:number) => [i, parseFloat(k[7] as string)])
        const mcLast = mcPts[mcPts.length-1][1], mc24ago = mcPts[Math.max(0,mcPts.length-7)][1]
        const mcPct = mc24ago ? ((mcLast-mc24ago)/mc24ago)*100 : 0
        const last6Vol = volPts.slice(-6).reduce((s:number,p:number[])=>s+p[1],0)
        const prev6Vol = volPts.slice(-12,-6).reduce((s:number,p:number[])=>s+p[1],0)
        const volPct = prev6Vol ? ((last6Vol-prev6Vol)/prev6Vol)*100 : 0
        const mcColor = mcPct>=0?'#1fa67d':'#ed7088', volColor=volPct>=0?'#1fa67d':'#ed7088'
        const mcChEl=el('s-mcap-ch'),volChEl=el('s-vol-ch')
        if(mcChEl){mcChEl.textContent=fmtPct(mcPct);mcChEl.className='bc-ch '+pCls(mcPct)}
        if(volChEl){volChEl.textContent=fmtPct(volPct);volChEl.className='bc-ch '+pCls(volPct)}
        const smEl=el('spark-mcap'),svEl=el('spark-vol')
        if(smEl)smEl.innerHTML=makeSpark(mcPts,mcColor)
        if(svEl)svEl.innerHTML=makeSpark(volPts,volColor)
      } catch {}
    }

    function renderMarketStats() {
      const btc=tickerData['BTCUSDT'],eth=tickerData['ETHUSDT']
      const d=globalData as {total_market_cap?:{usd?:number},market_cap_change_percentage_24h_usd?:number,market_cap_percentage?:{btc?:number},total_volume?:{usd?:number}}|null
      const c0=coins[0] as {market_cap?:number,total_volume?:number}|null
      const rows=[
        ['BTC Price',btc?fmtPx(btc.px):'—',btc?fmtPct(btc.ch):null,btc?pCls(btc.ch):''],
        ['ETH Price',eth?fmtPx(eth.px):'—',eth?fmtPct(eth.ch):null,eth?pCls(eth.ch):''],
        ['BTC Market Cap',c0?fmtLarge(c0.market_cap??0):'—',null,''],
        ['BTC 24h Volume',c0?fmtLarge(c0.total_volume??0):'—',null,''],
        ['Total Market Cap',d?fmtLarge(d.total_market_cap?.usd??0):'—',d?fmtPct(d.market_cap_change_percentage_24h_usd??0):null,d?pCls(d.market_cap_change_percentage_24h_usd??0):''],
        ['BTC Dominance',d?((d.market_cap_percentage?.btc??0).toFixed(1)+'%'):'—',null,''],
        ['Total Volume 24h',d?fmtLarge(d.total_volume?.usd??0):'—',null,''],
      ]
      const body=el('mkt-stats-body')
      if(!body)return
      body.innerHTML=rows.map(([lbl,val,ch,cls])=>`<div class="mst-row"><span class="mst-lbl">${lbl}</span><span class="mst-val">${val}${ch?`<span class="mst-ch ${cls}">${ch}</span>`:''}</span></div>`).join('')
    }

    async function fetchGlobal() {
      const [gj,fgj]=await Promise.allSettled([
        cgFetch('/api/v3/global'),
        fetch('/feargreed/fng/?limit=1').then(r=>r.json()),
      ])
      type GlobalData = {data?:{total_market_cap?:{usd?:number},total_volume?:{usd?:number},market_cap_percentage?:{btc?:number},market_cap_change_percentage_24h_usd?:number}}
      const d=(gj.status==='fulfilled'?(gj.value as GlobalData)?.data:null) as typeof globalData
      if(d){globalData=d;set('s-mcap',fmtLarge((d as {total_market_cap?:{usd?:number}}).total_market_cap?.usd??0));set('s-vol',fmtLarge((d as {total_volume?:{usd?:number}}).total_volume?.usd??0));set('s-btc',((d as {market_cap_percentage?:{btc?:number}}).market_cap_percentage?.btc??0).toFixed(1)+'%');renderMarketStats()}
      const fg=fgj.status==='fulfilled'?(fgj.value as {data?:{value?:string,value_classification?:string}[]})?.data?.[0]:null
      if(fg){const fgEl=el('s-fg');if(fgEl){fgEl.textContent=fg.value??'';fgEl.style.color='#ffffff'}set('s-fg-l',(fg.value_classification??'')+' ('+(fg.value??'')+')')}
    }

    async function fetchTrending() {
      type TrendingResp = {coins?:{item:{small?:string,thumb?:string,name:string,symbol:string,data?:{price_change_percentage_24h?:{usd?:number},price?:number}}}[]}
      const json=await cgFetch('/api/v3/search/trending') as TrendingResp|null
      if(!json?.coins)return
      const items=json.coins.slice(0,7).map(c=>c.item)
      const trendEl=el('trending')
      if(!trendEl)return
      trendEl.innerHTML=items.map((c,i)=>{
        const ch=c.data?.price_change_percentage_24h?.usd??0,px=c.data?.price??0
        return `<div class="flex justify-between items-center px-3.5 py-2 cursor-pointer hover:bg-[#161616] transition-colors duration-100"><div class="flex items-center gap-2 min-w-0"><div class="w-[18px] h-[18px] rounded-full bg-[#161616] flex items-center justify-center text-[9px] font-bold text-[#878c8f] shrink-0">${i+1}</div><img class="w-[22px] h-[22px] rounded-full object-cover shrink-0" src="${c.small||c.thumb}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><div><div class="text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis">${c.name}</div><div class="text-[10px] text-[#878c8f]">${c.symbol.toUpperCase()}</div></div></div><div class="flex flex-col items-end shrink-0 gap-0.5">${px>0?`<div class="text-[11px] [font-variant-numeric:tabular-nums]">${fmtPx(px)}</div>`:''}<div class="text-[11px] font-semibold [font-variant-numeric:tabular-nums] ${pCls(ch)}">${fmtPct(ch)}</div></div></div>`
      }).join('')
    }

    async function fetchCoins() {
      type Coin = {market_cap_rank:number,name:string,symbol:string,image:string,current_price:number,price_change_percentage_24h:number,price_change_percentage_7d_in_currency:number,market_cap:number,total_volume:number}
      const json=await cgFetch('/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=7d,24h') as Coin[]|null
      if(!Array.isArray(json))return
      coins=json.slice(0,20)
      const gainers=[...json].filter(c=>(c.price_change_percentage_24h??0)>0).sort((a,b)=>(b.price_change_percentage_24h??0)-(a.price_change_percentage_24h??0)).slice(0,7)
      const gainersEl=el('gainers')
      if(gainersEl)gainersEl.innerHTML=gainers.map(c=>{
        const ch=c.price_change_percentage_24h??0
        return `<div class="flex justify-between items-center px-3.5 py-2 cursor-pointer hover:bg-[#161616] transition-colors duration-100"><div class="flex items-center gap-2 min-w-0"><img class="w-[22px] h-[22px] rounded-full object-cover shrink-0" src="${c.image}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><div><div class="text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis">${c.name}</div><div class="text-[10px] text-[#878c8f]">${c.symbol.toUpperCase()}</div></div></div><div class="flex flex-col items-end shrink-0 gap-0.5"><div class="text-[11px] [font-variant-numeric:tabular-nums]">${fmtPx(c.current_price)}</div><div class="text-[11px] font-semibold [font-variant-numeric:tabular-nums] up">${fmtPct(ch)}</div></div></div>`
      }).join('')
      renderTable()
      buildConverter(json.slice(0,12))
      set('tbl-ts','Updated '+new Date().toLocaleTimeString())
      renderMarketStats()
    }

    function renderTable() {
      if(!coins.length)return
      const coinsEl=el('coins-tbl')
      if(!coinsEl)return
      type Coin = {market_cap_rank:number,name:string,symbol:string,image:string,current_price:number,price_change_percentage_24h:number,price_change_percentage_7d_in_currency:number,market_cap:number,total_volume:number}
      coinsEl.innerHTML=`<table class="w-full border-collapse"><thead><tr><th class="text-left px-[10px] py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#878c8f] whitespace-nowrap border-b border-[#1f1f1f]" style="width:32px">#</th><th class="text-left px-[10px] py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#878c8f] whitespace-nowrap border-b border-[#1f1f1f]">Name</th><th class="text-right px-[10px] py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#878c8f] whitespace-nowrap border-b border-[#1f1f1f]">Price</th><th class="text-right px-[10px] py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#878c8f] whitespace-nowrap border-b border-[#1f1f1f]">24h %</th><th class="text-right px-[10px] py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#878c8f] whitespace-nowrap border-b border-[#1f1f1f]">7d %</th><th class="text-right px-[10px] py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#878c8f] whitespace-nowrap border-b border-[#1f1f1f]">Market Cap</th><th class="text-right px-[10px] py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#878c8f] whitespace-nowrap border-b border-[#1f1f1f]">Volume (24h)</th></tr></thead><tbody>${(coins as Coin[]).map(c=>{
        const ch24=c.price_change_percentage_24h??0,ch7d=c.price_change_percentage_7d_in_currency??0
        return `<tr class="cursor-pointer hover:bg-[#161616] transition-colors duration-100"><td class="px-[10px] py-[9px] border-t border-[#1f1f1f] text-[#878c8f] text-[11px]">${c.market_cap_rank}</td><td class="px-[10px] py-[9px] border-t border-[#1f1f1f]"><div class="flex items-center gap-2"><img src="${c.image}" alt="" width="22" height="22" style="border-radius:50%;object-fit:cover;flex-shrink:0" loading="lazy" onerror="this.style.visibility='hidden'"><div><div class="text-xs font-semibold">${c.name}</div><div class="text-[10px] text-[#878c8f]">${c.symbol.toUpperCase()}</div></div></div></td><td class="text-right px-[10px] py-[9px] border-t border-[#1f1f1f] text-xs font-semibold [font-variant-numeric:tabular-nums]">${fmtPx(c.current_price)}</td><td class="text-right px-[10px] py-[9px] border-t border-[#1f1f1f] text-[11px] [font-variant-numeric:tabular-nums]"><span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] text-[10px] font-semibold ${pCls(ch24)==='up'?'bg-[rgba(31,166,125,0.15)] text-[#1fa67d]':'bg-[rgba(237,112,136,0.15)] text-[#ed7088]'}">${ch24>=0?'▲':'▼'} ${Math.abs(ch24).toFixed(2)}%</span></td><td class="text-right px-[10px] py-[9px] border-t border-[#1f1f1f] text-[11px] [font-variant-numeric:tabular-nums]"><span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] text-[10px] font-semibold ${pCls(ch7d)==='up'?'bg-[rgba(31,166,125,0.15)] text-[#1fa67d]':'bg-[rgba(237,112,136,0.15)] text-[#ed7088]'}">${ch7d>=0?'▲':'▼'} ${Math.abs(ch7d).toFixed(2)}%</span></td><td class="text-right px-[10px] py-[9px] border-t border-[#1f1f1f] text-[11px] [font-variant-numeric:tabular-nums] text-[#c8d2d6]">${fmtLarge(c.market_cap)}</td><td class="text-right px-[10px] py-[9px] border-t border-[#1f1f1f] text-[11px] [font-variant-numeric:tabular-nums] text-[#c8d2d6]">${fmtLarge(c.total_volume)}</td></tr>`
      }).join('')}</tbody></table>`
    }

    function buildConverter(list: unknown[]) {
      type CoinItem = {id:string,symbol:string,current_price:number}
      const fromSel=el('cv-from') as HTMLSelectElement|null,toSel=el('cv-to') as HTMLSelectElement|null
      if(!fromSel||!toSel)return
      const opts=(list as CoinItem[]).map(c=>`<option value="${c.id}" data-px="${c.current_price}">${c.symbol.toUpperCase()}</option>`).join('')
      fromSel.innerHTML=opts
      toSel.innerHTML='<option value="__usd" data-px="1">USD</option>'+opts
      const compute=()=>{
        const cvAmt=el('cv-amt') as HTMLInputElement|null
        const amt=parseFloat(cvAmt?.value||'0')||0
        const fromPx=parseFloat(fromSel.selectedOptions[0]?.dataset.px||'0')
        const toPx=parseFloat(toSel.selectedOptions[0]?.dataset.px||'1')||1
        const result=(amt*fromPx)/toPx
        const rEl=el('cv-result')
        if(rEl)rEl.textContent=isFinite(result)?(result>=1000?result.toLocaleString('en-US',{maximumFractionDigits:2}):result.toFixed(result>=1?4:8)):'—'
      }
      el('cv-amt')?.addEventListener('input',compute)
      fromSel.addEventListener('change',compute)
      toSel.addEventListener('change',compute)
      compute()
    }

    async function fetchFutData(sym: string) {
      const B='/fapi',s=sym+'USDT'
      try {
        const [ticker,oiData,lsRatio,takerRatio,oiHist]=await Promise.all([
          fetch(`${B}/fapi/v1/ticker/24hr?symbol=${s}`).then(r=>r.json()),
          fetch(`${B}/fapi/v1/openInterest?symbol=${s}`).then(r=>r.json()),
          fetch(`${B}/futures/data/globalLongShortAccountRatio?symbol=${s}&period=5m&limit=1`).then(r=>r.json()),
          fetch(`${B}/futures/data/takerlongshortRatio?symbol=${s}&period=5m&limit=1`).then(r=>r.json()),
          fetch(`${B}/futures/data/openInterestHist?symbol=${s}&period=5m&limit=12`).then(r=>r.json()),
        ])
        return{sym,ticker,oiData,lsRatio,takerRatio,oiHist}
      }catch(e){console.error('futData:',e);return null}
    }

    function renderLiqMap(data: unknown) {
      const body=el('liqmap-body')
      if(!body)return
      if(!data){body.innerHTML='<div class="flex items-center justify-center h-full text-[#878c8f] text-xs">No data</div>';return}
      type FutData = {ticker:{lastPrice:string},oiData:{openInterest:string}}
      const d = data as FutData
      const mark=parseFloat(d.ticker.lastPrice)||0
      const totalOI=parseFloat(d.oiData.openInterest)||0
      const LEVELS=20,RANGE=0.15,step=(mark*RANGE*2)/LEVELS
      const levels=[]
      for(let i=0;i<LEVELS;i++){
        const price=mark*(1-RANGE)+i*step,dist=Math.abs(price-mark)/mark
        const weight=Math.exp(-dist*12)+Math.exp(-Math.pow(dist-0.07,2)*200)*0.6
        levels.push({price,weight,isLong:price<mark})
      }
      const maxW=Math.max(...levels.map(l=>l.weight)),totalW=levels.reduce((s,l)=>s+l.weight,0)
      const reversed=[...levels].reverse()
      const markIdx=reversed.findIndex(l=>l.price<=mark)
      let html=''
      reversed.forEach((l,i)=>{
        const pct=(l.weight/maxW*100).toFixed(0),oiEst=(totalOI*l.weight/totalW*mark/1e6).toFixed(1)
        const color=l.isLong?'#1fa67d':'#ed7088'
        if(i===markIdx)html+='<div class="my-3 shrink-0"></div>'
        html+=`<div class="flex items-center gap-1.5 h-4 shrink-0"><span class="text-[9px] text-[#878c8f] min-w-[64px] text-right shrink-0 [font-variant-numeric:tabular-nums]">${fmtPx(l.price)}</span><div class="flex-1 h-[7px] bg-[rgba(255,255,255,0.04)] rounded-[2px] overflow-hidden"><div class="h-full rounded-[2px]" style="width:${pct}%;background:${color}"></div></div><span class="text-[9px] text-[#878c8f] min-w-[44px] text-right shrink-0 [font-variant-numeric:tabular-nums]">$${oiEst}M</span></div>`
      })
      body.innerHTML=html
    }

    function renderInflow(data: unknown) {
      const body=el('inflow-body')
      if(!body)return
      type FutData = {oiHist?:{sumOpenInterest:string,timestamp:number}[],ticker:{lastPrice:string}}
      const d = data as FutData
      if(!d?.oiHist?.length){body.innerHTML='<div class="flex items-center justify-center h-full text-[#878c8f] text-xs">No data</div>';return}
      const hist=d.oiHist,px=parseFloat(d.ticker.lastPrice)||0
      const rows=[...hist].reverse().map((h,i,arr)=>{
        const oi=parseFloat(h.sumOpenInterest),prev=arr[i+1]
        const delta=prev?oi-parseFloat(prev.sumOpenInterest):0
        const cls=delta>=0?'up':'dn'
        const time=new Date(h.timestamp).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
        return `<div class="mst-row"><span class="mst-lbl">${time}</span><span class="mst-val">${fmtHL(oi*px)}<span class="${cls}" style="font-size:10px">${delta>=0?'+':''}${fmtHL(Math.abs(delta*px))}</span></span></div>`
      }).join('')
      body.innerHTML=`<div style="font-size:10px;color:#878c8f;text-transform:uppercase;letter-spacing:.04em;padding:0 0 8px">OI Flow — 5m intervals</div>${rows}`
    }

    function renderAISignals(data: unknown) {
      const body=el('ai-body'),verdictEl=el('ai-verdict'),verdictValEl=el('ai-verdict-val'),symLbl=el('ai-sym-lbl')
      if(!body)return
      if(!data){body.innerHTML='<div style="color:#878c8f;font-size:12px;text-align:center;padding:20px">No data</div>';return}
      type FutData = {sym:string,ticker:{lastPrice:string,priceChangePercent:string,lastFundingRate?:string},lsRatio?:{longAccount:string,shortAccount:string}[],takerRatio?:{buyVol:string,sellVol:string}[],oiHist?:{sumOpenInterest:string}[]}
      const d = data as FutData
      if(symLbl)symLbl.textContent=d.sym
      const ch24=parseFloat(d.ticker.priceChangePercent)||0
      const ls=d.lsRatio?.[0],lr=ls?parseFloat(ls.longAccount):0.5,sr=ls?parseFloat(ls.shortAccount):0.5
      const taker=d.takerRatio?.[0],takerBuy=taker?parseFloat(taker.buyVol)/(parseFloat(taker.sellVol)||1):1
      const fr=(parseFloat(d.ticker.lastFundingRate||'0'))*100
      const hist=d.oiHist||[],oiFirst=hist.length?parseFloat(hist[0].sumOpenInterest):0,oiLast=hist.length?parseFloat(hist[hist.length-1].sumOpenInterest):0
      const oiTrend=oiFirst?(oiLast-oiFirst)/oiFirst*100:0
      const signals=[
        {name:'Long/Short Ratio',bull:lr<=0.52,val:`${(lr*100).toFixed(1)}% L / ${(sr*100).toFixed(1)}% S`,body:lr>0.52?'Longs crowded — watch for squeeze':'Shorts heavy — squeeze fuel building'},
        {name:'Taker Flow',bull:takerBuy>=1,val:`Buy ${(takerBuy/(1+takerBuy)*100).toFixed(0)}%`,body:takerBuy>=1?'Takers buying aggressively — bullish':'Takers selling into bids — bearish'},
        {name:'Funding',bull:Math.abs(fr)<0.03,val:`${fr>=0?'+':''}${fr.toFixed(4)}%`,body:Math.abs(fr)<0.03?'Neutral — no leverage extreme':fr>0?'Longs paying — crowded longs':'Shorts paying — bearish excess'},
        {name:'OI Momentum',bull:oiTrend>0,val:`${oiTrend>=0?'+':''}${oiTrend.toFixed(2)}%`,body:oiTrend>0?`OI rising ${oiTrend.toFixed(2)}% — new money in`:`OI falling ${Math.abs(oiTrend).toFixed(2)}% — unwinding`},
        {name:'24h Price',bull:ch24>=0,val:`${ch24>=0?'+':''}${ch24.toFixed(2)}%`,body:ch24>=0?'Bullish trend — continuation bias':'Bearish trend — continuation bias'},
      ]
      const bullCount=signals.filter(s=>s.bull).length
      const verdict=bullCount>=4?'STRONG BULL':bullCount>=3?'BULL LEAN':bullCount===2?'NEUTRAL':bullCount===1?'BEAR LEAN':'STRONG BEAR'
      const vc=bullCount>=3?'#1fa67d':bullCount===2?'#878c8f':'#ed7088'
      body.innerHTML=signals.map(s=>`<div class="bg-[#161616] rounded-md px-2.5 py-2 shrink-0"><div class="flex items-center gap-1.5 mb-0.5"><div class="w-[7px] h-[7px] rounded-full shrink-0" style="background:${s.bull?'#1fa67d':'#ed7088'}"></div><span class="text-[11px] font-semibold text-white">${s.name}</span><span class="text-[11px] font-bold ml-auto [font-variant-numeric:tabular-nums]" style="color:${s.bull?'#1fa67d':'#ed7088'}">${s.val}</span></div><div class="text-[10px] text-[#878c8f] leading-[1.4]">${s.body}</div></div>`).join('')
      if(verdictEl)verdictEl.style.display='flex'
      if(verdictValEl){verdictValEl.textContent=verdict;verdictValEl.style.color=vc}
    }

    async function refreshFut() {
      const data=await fetchFutData(futSym)
      futData=data
      if(futTab==='liqmap')renderLiqMap(data);else renderInflow(data)
      renderAISignals(data)
    }

    function initFut() {
      const pillsEl=el('fut-sym-pills')
      if(pillsEl){
        pillsEl.innerHTML=FUT_SYMS.map(s=>`<button class="sym-pill${s===futSym?' active':''}" data-sym="${s}">${s}</button>`).join('')
        pillsEl.addEventListener('click',e=>{
          const btn=(e.target as Element).closest('.sym-pill') as HTMLElement|null
          if(!btn)return
          futSym=btn.dataset.sym||'BTC'
          pillsEl.querySelectorAll('.sym-pill').forEach(b=>b.classList.toggle('active',b===btn))
          refreshFut()
        })
      }
      const tabsEl=el('fut-tabs')
      if(tabsEl){
        tabsEl.addEventListener('click',e=>{
          const btn=(e.target as Element).closest('.fut-tab') as HTMLElement|null
          if(!btn)return
          futTab=btn.dataset.tab||'liqmap'
          tabsEl.querySelectorAll('.fut-tab').forEach(b=>b.classList.toggle('active',b===btn))
          const lb=el('liqmap-body'),ib=el('inflow-body')
          if(lb)lb.style.display=futTab==='liqmap'?'':'none'
          if(ib)ib.style.display=futTab==='inflow'?'':'none'
          if(futData){if(futTab==='liqmap')renderLiqMap(futData);else renderInflow(futData)}
        })
      }
      refreshFut()
      setInterval(refreshFut,30_000)
    }

    const intervals: ReturnType<typeof setInterval>[] = []

    async function init() {
      buildTicker()
      initFut()
      fetchTicker()
      await delay(200); fetchGlobal()
      await delay(600); fetchCoins()
      await delay(600); fetchTrending()
      await delay(600); fetchSparklines()
      intervals.push(setInterval(fetchTicker,30_000))
      intervals.push(setInterval(fetchGlobal,120_000))
      intervals.push(setInterval(async()=>{await delay(300);fetchCoins()},90_000))
      intervals.push(setInterval(async()=>{await delay(600);fetchTrending()},120_000))
    }

    init()

    return () => { intervals.forEach(clearInterval) }
  }, [])

  return (
    <>
      <div className="ticker-wrap">
        <div className="ticker-track" id="ticker" />
      </div>

      <main className="max-w-[1440px] mx-auto px-6 pb-10 pt-6">
        <h1 className="text-lg font-bold tracking-[-0.03em] mb-4">Market Overview</h1>

        <div className="stat-top">
          <div className="big-card">
            <div className="bc-left">
              <div className="bc-val" id="s-mcap">—</div>
              <div className="bc-lbl"><span>Market Cap</span> <span className="bc-ch" id="s-mcap-ch" /></div>
            </div>
            <div className="bc-spark" id="spark-mcap" />
          </div>
          <div className="big-card">
            <div className="bc-left">
              <div className="bc-val" id="s-vol">—</div>
              <div className="bc-lbl"><span>24h Trading Volume</span> <span className="bc-ch" id="s-vol-ch" /></div>
            </div>
            <div className="bc-spark" id="spark-vol" />
          </div>
          <div className="small-row">
            <div className="small-card">
              <div className="sc-val" id="s-btc">—</div>
              <div className="sc-lbl">BTC Dominance</div>
            </div>
            <div className="small-card">
              <div className="sc-val" id="s-fg">—</div>
              <div className="sc-lbl" id="s-fg-l">Fear &amp; Greed</div>
            </div>
          </div>
        </div>

        <div className="mkt-stats-wrap">
          <div className="mkt-stats-hdr">Market Statistics</div>
          <div id="mkt-stats-body"><div className="p-4 text-[#878c8f] text-xs">Loading…</div></div>
        </div>

        <div className="fut-wrap">
          <div className="fut-left">
            <div className="fut-hdr">
              <span className="fut-title">Liquidation Map</span>
              <div className="sym-pills" id="fut-sym-pills" />
              <div className="fut-tabs" id="fut-tabs">
                <button className="fut-tab active" data-tab="liqmap">Liq Map</button>
                <button className="fut-tab" data-tab="inflow">OI Flow</button>
              </div>
            </div>
            <div id="liqmap-body" className="px-3.5 py-3 h-[280px] flex flex-col gap-[3px] overflow-hidden">
              <div className="flex items-center justify-center h-full text-[#878c8f] text-xs">Loading…</div>
            </div>
            <div id="inflow-body" className="px-3.5 py-3 h-[280px] overflow-y-auto" style={{display:'none'}}>
              <div className="flex items-center justify-center h-full text-[#878c8f] text-xs">Loading…</div>
            </div>
          </div>
          <div className="fut-right">
            <div className="fut-hdr">
              <span className="fut-title">AI Signals</span>
              <span className="text-[10px] text-[#878c8f] ml-auto" id="ai-sym-lbl">BTC</span>
            </div>
            <div className="px-3 py-2.5 flex flex-col gap-1.5 flex-1 overflow-y-auto" id="ai-body">
              <div className="text-[#878c8f] text-xs text-center p-5">Loading…</div>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[#1f1f1f] shrink-0" id="ai-verdict" style={{display:'none'}}>
              <span className="text-[11px] text-[#878c8f]">AI Signal</span>
              <span className="text-[13px] font-bold tracking-[0.02em]" id="ai-verdict-val">—</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4 max-[640px]:grid-cols-1">
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-md overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-[#1f1f1f] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#878c8f]">Trending</div>
            <div id="trending"><div className="p-5 text-center text-[#878c8f] text-xs">Loading…</div></div>
          </div>
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-md overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-[#1f1f1f] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#878c8f]">Top Gainers (24h)</div>
            <div id="gainers"><div className="p-5 text-center text-[#878c8f] text-xs">Loading…</div></div>
          </div>
        </div>

        <div className="conv-wrap">
          <div className="px-3.5 py-2.5 border-b border-[#1f1f1f] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#878c8f]">Converter</div>
          <div className="conv-body">
            <div className="conv-side">
              <input className="conv-input" type="number" id="cv-amt" defaultValue="1" min="0" />
              <select className="conv-sel" id="cv-from"></select>
            </div>
            <div className="conv-arrow">⇌</div>
            <div className="conv-side">
              <div className="conv-result" id="cv-result">—</div>
              <select className="conv-sel" id="cv-to"></select>
            </div>
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-md overflow-hidden mb-4">
          <div className="flex justify-between items-center px-3.5 py-2.5 border-b border-[#1f1f1f]">
            <span className="text-[13px] font-semibold">Top 20 by Market Cap</span>
            <span className="text-[11px] text-[#878c8f]" id="tbl-ts">—</span>
          </div>
          <div id="coins-tbl"><div className="p-5 text-center text-[#878c8f] text-xs">Loading market data…</div></div>
        </div>
      </main>
    </>
  )
}
