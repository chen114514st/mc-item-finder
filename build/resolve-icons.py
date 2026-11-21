"""物品名 → 客户端贴图路径匹配，并把用到的贴图从 client.jar 提取到 assets/icons/。

前置：cache/client.jar（官方客户端）、cache/mcdata/*-items.json（minecraft-data）
产出：cache/icon-map.json、assets/icons/**.png
用法：python3 build/resolve-icons.py
"""
import json, os, glob, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
JAR = 'cache/client.jar'
OUT = 'assets/icons'

SUFFIX = ['_double_slab', '_slab', '_stairs', '_wall', '_fence_gate', '_fence', '_button', '_pressure_plate',
          '_door', '_trapdoor', '_hanging_sign', '_sign', '_carpet', '_pane', '_bars']
COLORS = ('white orange magenta light_blue yellow lime pink gray light_gray '
          'cyan purple blue brown green red black').split()

# 单靠规则匹配不到的少量特例
ALIAS = {
    'grass': 'grass_block_top', 'magma_block': 'magma', 'snow_block': 'snow',
    'sticky_piston': 'piston_top_sticky', 'crossbow': 'crossbow_standby',
    'tipped_arrow': 'tipped_arrow_base', 'scute': 'turtle_scute',
    'suspicious_sand': 'suspicious_sand_0', 'suspicious_gravel': 'suspicious_gravel_0',
    'trial_spawner': 'trial_spawner_top_ejecting_reward',
    'decorated_pot': 'entity/decorated_pot/decorated_pot_base.png',
    'heavy_weighted_pressure_plate': 'iron_block', 'light_weighted_pressure_plate': 'gold_block',
    'enchanted_golden_apple': 'golden_apple', 'petrified_oak_slab': 'oak_planks',
    'smooth_quartz': 'quartz_block_top', 'smooth_sandstone': 'sandstone_top',
    'smooth_red_sandstone': 'red_sandstone_top', 'dried_kelp_block': 'dried_kelp_side',
    'dried_ghast': 'dried_ghast_hydration_0_top', 'crimson_hyphae': 'crimson_stem',
    'warped_hyphae': 'warped_stem', 'stripped_crimson_hyphae': 'stripped_crimson_stem',
    'stripped_warped_hyphae': 'stripped_warped_stem', 'debug_stick': 'stick',
    'copper_chest': 'copper_block', 'exposed_copper_chest': 'exposed_copper',
    'weathered_copper_chest': 'weathered_copper', 'oxidized_copper_chest': 'oxidized_copper',
    'copper_golem_statue': 'copper_block', 'exposed_copper_golem_statue': 'exposed_copper',
    'weathered_copper_golem_statue': 'weathered_copper',
    'oxidized_copper_golem_statue': 'oxidized_copper',
    'chest': 'oak_planks', 'trapped_chest': 'oak_planks', 'ender_chest': 'obsidian',
    'waxed_lightning_rod': 'lightning_rod', 'waxed_exposed_lightning_rod': 'exposed_lightning_rod',
    'waxed_weathered_lightning_rod': 'weathered_lightning_rod',
    'waxed_oxidized_lightning_rod': 'oxidized_lightning_rod',
    'chain': 'iron_chain', 'test_block': 'test_block_start',
    'infested_chiseled_stone_bricks': 'chiseled_stone_bricks',
    'infested_cracked_stone_bricks': 'cracked_stone_bricks',
    # 基岩版旧名称
    'lit_furnace': 'furnace_front_on', 'lit_smoker': 'smoker_front_on',
    'lit_blast_furnace': 'blast_furnace_front_on', 'lit_redstone_lamp': 'redstone_lamp_on',
    'lit_redstone_ore': 'redstone_ore', 'lit_deepslate_redstone_ore': 'deepslate_redstone_ore',
    'noteblock': 'note_block', 'slime': 'slime_block', 'web': 'cobweb', 'deadbush': 'dead_bush',
    'waterlily': 'lily_pad', 'tallgrass': 'short_grass', 'reeds': 'sugar_cane',
    'hardened_clay': 'terracotta', 'stonebrick': 'stone_bricks', 'netherbrick': 'nether_bricks',
    'red_nether_brick': 'red_nether_bricks', 'end_bricks': 'end_stone_bricks',
    'grass_path': 'dirt_path', 'melon_block': 'melon', 'quartz_ore': 'nether_quartz_ore',
    'silver_glazed_terracotta': 'light_gray_glazed_terracotta',
    'zombie_pigman_spawn_egg': 'zombified_piglin_spawn_egg',
    'normal_stone_slab': 'stone_slab', 'normal_stone_stairs': 'stone_stairs',
    'normal_stone_double_slab': 'stone_slab', 'stained_glass': 'glass',
    'stained_glass_pane': 'glass_pane', 'hard_glass': 'glass', 'hard_glass_pane': 'glass_pane',
    'wood': 'oak_log', 'planks': 'oak_planks', 'log': 'oak_log', 'leaves': 'oak_leaves',
    'leaves2': 'dark_oak_leaves', 'wool': 'white_wool', 'carpet': 'white_carpet',
    'sapling': 'oak_sapling', 'red_flower': 'poppy', 'yellow_flower': 'dandelion',
    'double_plant': 'sunflower', 'trapdoor': 'oak_trapdoor', 'fence': 'oak_fence',
    'fence_gate': 'oak_fence_gate', 'wooden_slab': 'oak_slab', 'wooden_door': 'oak_door',
    'wooden_button': 'oak_button', 'wooden_pressure_plate': 'oak_pressure_plate',
    'standing_sign': 'oak_sign', 'wall_sign': 'oak_sign', 'frame': 'item_frame',
    'glow_frame': 'glow_item_frame', 'trip_wire': 'tripwire', 'vine': 'vine',
    'mob_spawner': 'spawner', 'frosted_ice': 'frosted_ice', 'lava': 'lava',
    'water': 'water', 'fire': 'fire', 'portal': 'nether_portal',
}


def main():
    z = zipfile.ZipFile(JAR)
    names = set(z.namelist())
    item_tex = {n.split('/')[-1][:-4] for n in names
                if n.startswith('assets/minecraft/textures/item/') and n.endswith('.png')}
    block_tex = {n.split('/')[-1][:-4] for n in names
                 if n.startswith('assets/minecraft/textures/block/') and n.endswith('.png')}

    def find(c):
        if c in item_tex:
            return 'item/' + c + '.png'
        if c in block_tex:
            return 'block/' + c + '.png'
        return None

    def find_any(c):
        if '/' in c and c.endswith('.png'):
            return c if 'assets/minecraft/textures/' + c in names else None
        return find(c)

    def strip_prefix(n):
        for p in ('waxed_', 'infested_'):
            if n.startswith(p):
                return n[len(p):]
        return n

    def base_variants(b):
        out = [b]
        if b.endswith('_brick'):
            out.append(b[:-6] + '_bricks')
        if b.endswith('_tile'):
            out.append(b[:-5] + '_tiles')
        s = strip_prefix(b)
        if s != b:
            out.append(s)
        for x in list(out):
            if x.startswith('smooth_'):
                out.append(x[7:])
        return out

    items = set()
    for f in glob.glob('cache/mcdata/*-items.json'):
        for it in json.load(open(f)):
            items.add(it['name'])
    for f in glob.glob('cache/mcdata/be-*-items.json'):
        for it in json.load(open(f)):
            n = it['name']
            for pre in ('minecraft:', 'item.'):
                if n.startswith(pre):
                    n = n[len(pre):]
            if n:
                items.add(n)

    def norm_name(n):
        for pre in ('minecraft:', 'item.'):
            if n.startswith(pre):
                n = n[len(pre):]
        return n

    res, miss = {}, []
    for n in sorted(items):
        m = norm_name(n)
        cands = [m]
        if m != n:
            cands.append(n)
        s = strip_prefix(m)
        if s != n:
            cands.append(s)
        for c in list(cands):
            if c in ALIAS:
                cands.append(ALIAS[c])
            cands.append(c + '_00')                 # 动态贴图取第一帧
        if m.endswith('_wood'):
            cands.append(m[:-5] + '_log')
        if m.endswith('_bed'):
            cands.append(m[:-4] + '_bed_foot_north')
            cands.append(m[:-4] + '_wool')
        if m.endswith('_banner'):
            cands.append(m[:-7] + '_wool')
        base = None
        for suf in sorted(SUFFIX, key=len, reverse=True):
            if m.endswith(suf):
                base = m[:-len(suf)]
                break
        if base:
            cands += base_variants(base)
            for b in base_variants(base):
                if b in COLORS:
                    cands.append(b + '_wool')
                cands += [b + '_top', b + '_s', b + '_bricks', b + '_planks',
                          b + '_block', b + '_side', b + '_log']
        if m.endswith('_candle_cake'):
            cands.append('cake')
        for c in list(cands):
            cands += [c + '_top', c + '_side', c + '_front']
        hit = None
        for c in cands:
            hit = find_any(c)
            if hit:
                break
        if hit:
            res[n] = hit
        else:
            miss.append(n)

    json.dump(res, open('cache/icon-map.json', 'w'), ensure_ascii=False)
    print('匹配', len(res), '/', len(items), '缺失', len(miss))
    print('缺失清单:', json.dumps(miss, ensure_ascii=False))

    # 提取用到的贴图
    total = 0
    for p in sorted(set(res.values())):
        dst = os.path.join(OUT, p)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        data = z.read('assets/minecraft/textures/' + p)
        with open(dst, 'wb') as fp:
            fp.write(data)
        total += len(data)
    print('提取贴图', len(set(res.values())), '张，', total, '字节')


if __name__ == '__main__':
    main()
