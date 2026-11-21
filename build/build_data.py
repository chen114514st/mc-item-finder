import json, os, re, datetime
from pypinyin import lazy_pinyin, Style

VERSIONS=[('26.1','26.1'),('1.21.11','1.21.11'),('1.21.8','1.21.8'),('1.21.4','1.21.4'),('1.20.6','1.20.6'),('1.20.1','1.20.1')]
BEDROCK=[('1.26.60','1.26.60'),('1.21.100','1.21.100'),('1.21.50','1.21.50'),('1.20.80','1.20.80')]
LANGS=[('zh_cn','简体中文'),('zh_tw','繁體中文'),('ja_jp','日本語'),('ko_kr','한국어'),('ru_ru','Русский'),('de_de','Deutsch'),('fr_fr','Français'),('es_es','Español (ES)'),('es_mx','Español (MX)'),('pt_br','Português (BR)'),('it_it','Italiano'),('pl_pl','Polski'),('tr_tr','Türkçe'),('nl_nl','Nederlands'),('uk_ua','Українська'),('vi_vn','Tiếng Việt'),('th_th','ไทย'),('id_id','Bahasa Indonesia'),('ar_sa','العربية'),('sv_se','Svenska'),('cs_cz','Čeština')]
CACHE='cache'; OUT='data'
os.makedirs(OUT,exist_ok=True)
icon_map=json.load(open(f'{CACHE}/icon-map.json'))
en_us=json.load(open(f'{CACHE}/en_us.json'))
alllang={c:json.load(open(f'{CACHE}/lang/{c}.json')) for c,_ in LANGS}
newlang={c:json.load(open(f'{CACHE}/mcmeta-lang/{c}.json')) for c,_ in LANGS}

def load(ver,f):
    p=f'{CACHE}/mcdata/{ver}-{f}.json'
    if os.path.exists(p):
        try: return json.load(open(p))
        except Exception: return None
    return None
def beload(ver,f):
    return load('be-'+ver,f)

def lk(code,key):
    """取某语言下 key 的翻译：新版 mcmeta 优先，All-Lang 兜底"""
    d=newlang.get(code) or {}
    v=d.get(key)
    if v is None:
        v=(alllang.get(code) or {}).get(key)
    return v
def lk_any(key):
    """所有语言的该 key 翻译 {code: text}"""
    out={}
    for c,_ in LANGS:
        v=lk(c,key)
        if v is not None: out[c]=v
    return out

def tool_cn(material):
    if not material: return None
    m=material.split('/')[-1]
    return {'pickaxe':'镐','axe':'斧','shovel':'锹','hoe':'锄','shears':'剪刀','sword':'剑'}.get(m, m)

ARMOR_SUF=('_helmet','_chestplate','_leggings','_boots')
TOOLS=('_pickaxe','_axe','_shovel','_hoe','shears','fishing_rod','flint_and_steel','brush')
WEAPONS=('_sword',)
WEAPON_SET={'bow','crossbow','trident','mace','arrow','spectral_arrow','tipped_arrow','shield','wind_charge'}
def categorize(name, in_blocks, in_foods):
    tags=[]
    if name.endswith('_spawn_egg'): tags.append('刷怪蛋')
    if name in ('potion','splash_potion','lingering_potion'): tags.append('药水')
    if name.endswith(WEAPONS) or name in WEAPON_SET: tags.append('武器')
    if name.endswith(TOOLS) or name in TOOLS: tags.append('工具')
    if name.endswith(ARMOR_SUF) or name in ('elytra','turtle_helmet'): tags.append('护甲')
    if in_foods: tags.append('食物')
    if in_blocks: tags.append('方块')
    if not tags: tags.append('杂项')
    order=['刷怪蛋','药水','武器','工具','护甲','食物','方块','杂项']
    tags.sort(key=lambda t: order.index(t))
    return tags[0], tags

foods_all={}
for ver,_ in VERSIONS:
    f=load(ver,'foods')
    if f:
        for x in f: foods_all.setdefault(x['name'], x)
for x in (load('1.20.6','foods') or []): foods_all.setdefault(x['name'],x)

# ---------- 方块状态 ----------
def bs_java(b):
    props=[]
    for st in (b.get('states') or []):
        vals=st.get('values')
        if not vals:
            t=st.get('type'); nv=st.get('num_values',2)
            if t=='bool': vals=['true','false']
            elif t=='int': vals=[str(i) for i in range(nv)]
            else: vals=['?']*nv
        props.append(str(st['name'])+'='+'|'.join(str(v) for v in vals))
    return props

def bedrock_state_props(states):
    agg={}
    for st in states:
        for k,v in (st.get('states') or {}).items():
            if isinstance(v,dict): v=v.get('value',v)
            agg.setdefault(k,set()).add(str(v))
    out=[]
    for k in sorted(agg):
        vals=sorted(agg[k], key=lambda s:(len(s),s))
        out.append(k+'='+'|'.join(vals))
    return out

# ---------- 变体定义 ----------
def s2i(v):
    try: return int(v)
    except Exception: return 0

def ver_ge(a,b):
    """a,b 形如 '1.21.4' / '26.1'，比较 (主,次,修订)"""
    def p(x): return tuple(s2i(i) for i in str(x).replace('-','.').split('.')[:3])
    return p(a)>=p(b)

EFFECT_KEYS=[k[len('item.minecraft.potion.effect.'):] for k in en_us if k.startswith('item.minecraft.potion.effect.')]
EFFECT_KEYS=[e for e in EFFECT_KEYS if e!='empty']
NEW_EFFECTS={'infested','oozing','weaving','wind_charged'}
ENCH=[e['name'] for e in (load('26.1','enchantments') or [])]
HORNS=[k[len('instrument.minecraft.'):] for k in en_us if k.startswith('instrument.minecraft.') and k.endswith('_goat_horn')]
PAINT=[k[len('painting.minecraft.'):-len('.title')] for k in en_us if k.startswith('painting.minecraft.') and k.endswith('.title')]
SHAPES=['small_ball','large_ball','star','creeper','burst']

def compose(code, kind, payload):
    """返回该语言下的变体显示名；code=None 表示英文(en_us)"""
    def L(key):
        if code is None: return en_us.get(key)
        return lk(code,key)
    name=lambda n: (L('item.minecraft.'+n) or L('block.minecraft.'+n) or en_us.get('item.minecraft.'+n) or en_us.get('block.minecraft.'+n) or n)
    zh = (code=='zh_cn')
    if kind=='potion': return L('item.minecraft.potion.effect.'+payload) or name('potion')
    if kind=='splash': return L('item.minecraft.splash_potion.effect.'+payload) or name('splash_potion')
    if kind=='lingering': return L('item.minecraft.lingering_potion.effect.'+payload) or name('lingering_potion')
    if kind=='arrow': return L('item.minecraft.tipped_arrow.effect.'+payload) or name('tipped_arrow')
    if kind=='book':
        e,lvl=payload
        en=L('enchantment.minecraft.'+e) or e
        rl=L('enchantment.level.'+str(lvl)) or str(lvl)
        return name('enchanted_book')+' · '+en+' '+rl
    if kind=='horn':
        i=L('instrument.minecraft.'+payload) or payload
        return name('goat_horn')+' · '+i
    if kind=='paint':
        t=L('painting.minecraft.'+payload+'.title') or payload
        a=L('painting.minecraft.'+payload+'.author') or ''
        return name('painting')+' · '+t+('（'+a+'）' if (zh and a) else (' ('+a+')' if a else ''))
    if kind=='rocket':
        return name('firework_rocket')+' · '+('飞行时间 '+str(payload) if zh else 'Flight '+str(payload))
    if kind=='shape':
        sh=L('item.minecraft.firework_star.shape.'+payload) or payload
        return name('firework_star')+' · '+sh
    return kind

def variant_rows(ver):
    """按版本生成变体行（1.20.5+ 组件语法 / 旧版 NBT 语法在 core.js 里区分）"""
    rows=[]
    newer=ver_ge(ver,'1.21')
    effs=[e for e in EFFECT_KEYS if newer or e not in NEW_EFFECTS]
    for kind,base in (('potion','potion'),('splash','splash_potion'),('lingering','lingering_potion'),('arrow','tipped_arrow')):
        for e in effs:
            cat='药水' if base!='tipped_arrow' else '武器'
            rows.append({'n':kind+'#'+e,'b':base,'c':[kind,e],'s':1,'cat':cat})
    ench_names={x['name'] for x in (load(ver,'enchantments') or []) if 'name' in x} or set(ENCH)
    for e in ENCH:
        if e not in ench_names: continue
        mx=1
        for x in (load(ver,'enchantments') or []):
            if x.get('name')==e: mx=x.get('maxLevel',1); break
        rows.append({'n':'book#'+e,'b':'enchanted_book','c':['book',e,mx],'s':1,'cat':'杂项'})
    for h in HORNS:
        rows.append({'n':'horn#'+h,'b':'goat_horn','c':['horn',h],'s':1,'cat':'杂项'})
    for p in PAINT:
        rows.append({'n':'paint#'+p,'b':'painting','c':['paint',p],'s':1,'cat':'杂项'})
    for f in (1,2,3):
        rows.append({'n':'rocket#'+str(f),'b':'firework_rocket','c':['rocket',f],'s':1,'cat':'杂项'})
    for s in SHAPES:
        rows.append({'n':'shape#'+s,'b':'firework_star','c':['shape',s],'s':1,'cat':'杂项'})
    return rows

meta_versions=[]
allnames=set()
var_names=[]          # [(n, kind, payload)]
var_en={}
for ver,label in VERSIONS:
    items=load(ver,'items'); blocks=load(ver,'blocks')
    if not items: raise SystemExit('missing items '+ver)
    blockmap={b['name']:b for b in (blocks or [])}
    rows=[]
    for it in items:
        n=it['name']; allnames.add(n)
        b=blockmap.get(n)
        row={'id':it['id'],'n':n,'s':it.get('stackSize',64)}
        en=en_us.get('item.minecraft.'+n) or en_us.get('block.minecraft.'+n) or it.get('displayName') or n
        row['en']=en
        if it.get('maxDurability'): row['d']=it['maxDurability']
        fd=foods_all.get(n)
        if fd: row['food']=[fd.get('foodPoints'),fd.get('saturation')]
        if b:
            row['blk']={'h':b.get('hardness'),'r':b.get('resistance'),'l':b.get('emitLight',0),'tr':1 if b.get('transparent') else 0,'dig':1 if b.get('diggable') else 0}
            t=tool_cn(b.get('material'))
            if t: row['blk']['tool']=t
            props=bs_java(b)
            if props:
                row['bs']=props
                sc=(b.get('maxStateId',0)-b.get('minStateId',0)+1)
                if sc>1: row['sc']=sc
                if b.get('defaultState') is not None: row['ds']=b['defaultState']
        cat,tags=categorize(n, b is not None, fd is not None)
        row['cat']=cat
        if len(tags)>1: row['tags']=tags
        ic=icon_map.get(n)
        if ic: row['ic']=ic
        rows.append(row)
    # 物品变体
    for vr in variant_rows(ver):
        base=vr['b']; kind=vr['c'][0]
        payload=vr['c'][1] if len(vr['c'])==2 else (vr['c'][1],vr['c'][2])
        disp=compose(None, kind, payload)
        row=dict(vr); row['en']=disp
        ic=icon_map.get(base)
        if ic: row['ic']=ic
        row['id']=-1
        rows.append(row)
        if vr['n'] not in var_en:
            var_en[vr['n']]=disp
            var_names.append((vr['n'], kind, payload))
    data={'id':ver,'label':label,'family':'java','count':len(rows),'items':rows}
    with open(f'{OUT}/items-{ver}.js','w') as fp:
        fp.write('window.MCDATA=window.MCDATA||{};window.MCDATA.versions=window.MCDATA.versions||{};\n')
        fp.write('window.MCDATA.versions['+json.dumps(ver)+']='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
    cnt=len(rows); vitems=len(items)
    meta_versions.append({'id':ver,'label':label,'family':'java','count':cnt,'items':vitems,'variants':cnt-vitems,'size':os.path.getsize(f'{OUT}/items-{ver}.js')})
    print('java',ver,'条目',cnt,'（物品',vitems,'变体',cnt-vitems,'）',os.path.getsize(f'{OUT}/items-{ver}.js'))

# ---------- 基岩版 ----------
for ver,label in BEDROCK:
    items=beload(ver,'items'); blocks=beload(ver,'blocks')
    if not items: raise SystemExit('missing bedrock items '+ver)
    blockmap={b['name']:b for b in (blocks or [])}
    bstates=beload(ver,'blockStates') or []
    byname={}
    for x in bstates: byname.setdefault(x.get('name'),[]).append(x)
    blk_props={}
    for b in (blocks or []):
        props=bedrock_state_props(byname.get(b['name']) or [])
        if props: blk_props[b['name']]=props
    rows=[]
    for it in items:
        n=it['name']
        if n.startswith('minecraft:'): n=n[len('minecraft:'):]
        b=blockmap.get(n)
        row={'id':it.get('id',-1),'n':n,'s':it.get('stackSize',64)}
        en=it.get('displayName') or en_us.get('item.minecraft.'+n) or en_us.get('block.minecraft.'+n) or n
        row['en']=en
        if it.get('maxDurability'): row['d']=it['maxDurability']
        fd=foods_all.get(n)
        if fd: row['food']=[fd.get('foodPoints'),fd.get('saturation')]
        if b:
            row['blk']={'h':b.get('hardness'),'r':b.get('resistance'),'l':b.get('emitLight',0),'tr':1 if b.get('transparent') else 0,'dig':1 if b.get('diggable') else 0}
            t=tool_cn(b.get('material'))
            if t: row['blk']['tool']=t
            props=blk_props.get(n)
            if props:
                row['bs']=props
                sc=(b.get('maxStateId',0)-b.get('minStateId',0)+1)
                if sc>1: row['sc']=sc
                if b.get('defaultState') is not None: row['ds']=b['defaultState']
        cat,tags=categorize(n, b is not None, fd is not None)
        row['cat']=cat
        if len(tags)>1: row['tags']=tags
        ic=icon_map.get(n)
        if ic: row['ic']=ic
        rows.append(row)
    vid='be:'+ver
    data={'id':vid,'label':label,'family':'bedrock','count':len(rows),'items':rows}
    with open(f'{OUT}/be-items-{ver}.js','w') as fp:
        fp.write('window.MCDATA=window.MCDATA||{};window.MCDATA.versions=window.MCDATA.versions||{};\n')
        fp.write('window.MCDATA.versions['+json.dumps(vid)+']='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
    meta_versions.append({'id':vid,'label':label,'family':'bedrock','count':len(rows),'size':os.path.getsize(f'{OUT}/be-items-{ver}.js')})
    print('bedrock',ver,len(rows),os.path.getsize(f'{OUT}/be-items-{ver}.js'))

# ---------- 语言包 ----------
names=sorted(allnames)
meta_langs=[]
for code,label in LANGS:
    old=alllang[code]; new=newlang[code]
    i={}; b={}
    for n in names:
        v=old.get('item.minecraft.'+n)
        if v is None: v=new.get('item.minecraft.'+n)
        if v is not None: i[n]=v
        v=old.get('block.minecraft.'+n)
        if v is None: v=new.get('block.minecraft.'+n)
        if v is not None: b[n]=v
    pack={'i':i,'b':b}
    vn={}
    for vid,kind,payload in var_names:
        v=compose(code,kind,payload)
        if v: vn[vid]=v
    pack['vn']=vn
    if code=='zh_cn':
        py={}
        for n in names:
            cn=i.get(n) or b.get(n)
            if not cn: continue
            if not re.search(r'[\u4e00-\u9fff]', cn): continue
            py[n]=[cn,''.join(lazy_pinyin(cn, style=Style.NORMAL)),''.join(lazy_pinyin(cn, style=Style.FIRST_LETTER))]
        pack['py']=py
        vp={}
        for vid,cn in vn.items():
            if not cn or not re.search(r'[\u4e00-\u9fff]', cn): continue
            vp[vid]=[cn,''.join(lazy_pinyin(cn, style=Style.NORMAL)),''.join(lazy_pinyin(cn, style=Style.FIRST_LETTER))]
        pack['vp']=vp
    with open(f'{OUT}/lang-{code}.js','w') as fp:
        fp.write('window.MCDATA=window.MCDATA||{};window.MCDATA.langs=window.MCDATA.langs||{};\n')
        fp.write('window.MCDATA.langs['+json.dumps(code)+']='+json.dumps(pack,ensure_ascii=False,separators=(',',':'))+';\n')
    meta_langs.append({'code':code,'label':label,'size':os.path.getsize(f'{OUT}/lang-{code}.js')})
    print('lang',code,len(i)+len(b),len(vn),os.path.getsize(f'{OUT}/lang-{code}.js'))

meta={'versions':meta_versions,'langs':meta_langs,'built':datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),
      'iconCount':len(set(icon_map.values())),'iconResolved':len(icon_map),
      'variantCount':len(var_names),'families':['java','bedrock']}
with open(f'{OUT}/meta.js','w') as fp:
    fp.write('window.MCDATA=window.MCDATA||{};window.MCDATA.meta='+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+';\n')
print('meta',os.path.getsize(f'{OUT}/meta.js'))
