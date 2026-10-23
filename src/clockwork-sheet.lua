--[[
  Clockwork Companion · character sheet script for Tabletop Simulator
  Paste this whole file into the Lua script of your Clockwork sheet object
  (right-click the sheet > Scripting > Scripting Editor, then Save & Play).

  What it does
  • Marks attributes on the printed pips: above 10 they fill from the left
    (brass for points bought with Karma), broken attributes below 10 fill red
    from the right. Each row gets a readout like "6  (−4)" with −/+ buttons
    just off the card's right edge.
  • Draws clickable pips for skills, the 4 weapon lines and the 6 secondary lines.
  • Writes name, profession, faction, age, height, weight, Karma and Pool.
  • Adds a vitals panel beside the card: HP, Blood, Deprivation, Toxicity,
    Exhaustion, Stamina lost and wounds. Left-click ±1, right-click ±5.
  • "Load code" takes a code from the Clockwork Companion web app;
    "Export" gives a code to paste back into the web app after the session.
  • Everything saves with your TTS game.

  First-time setup: click "Calibrate". Four gold squares appear over printed
  circles, with buttons to mirror, flip, shrink or grow everything until they
  sit on the circles. Click Done. The setting saves with the sheet, so copies
  of a calibrated sheet are already aligned.
]]

---------------------------------------------------------------- settings
-- Starting calibration. These are only defaults: the in-game Calibrate buttons
-- change them and the result is saved with the sheet.
local cfg = {flipX = false, flipZ = false, scale = 500}
local SURFACE_Y     = 0.16   -- height of the pips above the card face (card top is at 0.13)
local INK           = {0.08, 0.075, 0.07, 1}
local CLEAR         = {0, 0, 0, 0}
local HOVER         = {0.55, 0.36, 0.09, 0.35}
local PANEL_BG      = {0.12, 0.11, 0.10, 0.92}
local PANEL_INK     = {0.92, 0.90, 0.86, 1}

---------------------------------------------------------------- sheet geometry
-- Image positions are fractions of the 2000×2000 texture (0,0 = top-left).
-- The front face shows u 0.485248 → 0.968543 across 22.522 units, v top → bottom across 35.390 units.
local U0, UW, XW, ZH = 0.485248, 0.483295, 22.522358, 35.39013

local function at(xf, yf, lift)
  local x = -11.261179 + (xf - U0) / UW * XW
  local z = -17.695065 + yf * ZH
  if cfg.flipX then x = -x end
  if cfg.flipZ then z = -z end
  return {x, lift or SURFACE_Y, z}
end
local function sizeX(f) return f / UW * XW * cfg.scale end
local function sizeZ(f) return f * ZH * cfg.scale end

local ATTR_COLS  = {0.68272, 0.7068, 0.73106, 0.75514, 0.7794, 0.80348, 0.82774, 0.85182, 0.87608, 0.90016}
local ATTR_ROWS  = {0.18316, 0.20812, 0.23308, 0.2582, 0.28318, 0.30814, 0.3331}
local WEAP_COLS  = {0.80847, 0.82095, 0.83327, 0.84573, 0.85815, 0.87054, 0.883, 0.89541, 0.90783, 0.92028}
local WEAP_ROWS  = {0.36959, 0.3846, 0.39963, 0.41459}
local LEFT_COLS  = {0.59079, 0.60318, 0.61565, 0.62805, 0.64045, 0.65293, 0.66532, 0.6777, 0.69019, 0.7027}
local RIGHT_COLS = {0.80901, 0.82149, 0.8338, 0.84628, 0.85867, 0.87107, 0.88354, 0.89608, 0.90834, 0.92081}
local SEC_COLS   = {0.82624, 0.85955, 0.89295}
local SEC_ROWS   = {0.85577, 0.87573, 0.89568, 0.91571, 0.93575, 0.95579}

local ATTRS = {"STR", "DEX", "END", "MND", "WIL", "WIS", "PRS"}
local ATTR_NAMES = {STR = "Strength", DEX = "Dexterity", END = "Endurance", MND = "Mind", WIL = "Willpower", WIS = "Wisdom", PRS = "Presence"}

-- Skill rows exactly as printed (column, rows, names)
local SKILL_LAYOUT = {
  {LEFT_COLS,  {0.47407, 0.48908, 0.50464, 0.51907, 0.53409, 0.54913},
    {"Maim", "Bash", "Cleave", "Parry", "Armor Mastery", "Strong Back"}},
  {LEFT_COLS,  {0.59858, 0.61364, 0.62911, 0.64355, 0.65864, 0.67358, 0.68861, 0.7036},
    {"Belly", "Deprivation", "Bleed Resistance", "Durability", "Shield Mastery", "Conditioning", "Versatility", "Metabolism"}},
  {LEFT_COLS,  {0.75356, 0.76858, 0.78414, 0.79856, 0.81359, 0.82862},
    {"Armor Maintenance", "Weapon Maintenance", "Brewing", "Powdertinker", "Awareness", "Medicine"}},
  {LEFT_COLS,  {0.87854, 0.89365, 0.90912, 0.92354, 0.93865},
    {"Taming", "Leadership", "Runecrafting", "Hunting", "Perform"}},
  {RIGHT_COLS, {0.47513, 0.49007, 0.50554, 0.52013, 0.53507, 0.55009, 0.5652},
    {"Tumble", "Pierce", "Precision", "Subtlety", "Alacrity", "Martial Arts", "Evasion"}},
  {RIGHT_COLS, {0.62014, 0.63509, 0.65055, 0.66514, 0.68008},
    {"Demonology", "Alchemy", "Engineering", "Robotics", "Lore"}},
  {RIGHT_COLS, {0.7351, 0.75004, 0.76509, 0.7801},
    {"Warding", "Sangromancy", "Dreamwalking", "Occult: Harmony"}},
}

-- Governing attribute of each SKILL_LAYOUT block, in the same order
local BLOCK_ATTR = {"STR", "END", "WIS", "PRS", "DEX", "MND", "WIL"}
local WEAPON_ATTR = {Slashing = "STR", Piercing = "STR", Bludgeoning = "STR", Unarmed = "STR", Motorized = "STR", Improvised = "STR",
  Rifles = "DEX", Pistols = "DEX", ["Sniper Rifles"] = "DEX", Shotguns = "DEX", Explosives = "DEX",
  Stringed = "DEX", Throwing = "DEX", Finesse = "DEX", Heavy = "DEX"}

-- Text fields: {key, x, y, width fraction, font scale}
local TEXT_FIELDS = {
  {"name",       0.6895, 0.0262, 0.25, 1.00},
  {"karma",      0.5370, 0.0790, 0.05, 0.85},
  {"pool",       0.6350, 0.0790, 0.05, 0.85},
  {"profession", 0.7790, 0.0580, 0.08, 0.55},
  {"faction",    0.7810, 0.0730, 0.08, 0.55},
  {"age",        0.7250, 0.0952, 0.04, 0.55},
  {"height",     0.7330, 0.1087, 0.04, 0.55},
  {"weight",     0.8075, 0.1087, 0.03, 0.55},
}
local PORTRAIT = {x = 0.8877, y = 0.0657, w = 0.1139, h = 0.1113}

---------------------------------------------------------------- state
local data = nil          -- the loaded character (same shape as the web app's code)
local locked = false
local btn = {}            -- button index lookups
local nextIndex = 0
local codeOpen = nil      -- "load" | "export" | nil
local pastedCode = ""
local calibrating = false

local function blank()
  local d = {cw = 1, name = "", profession = "", faction = "", age = "", height = "", weight = "",
             karma = 0, pool = 0, portrait = "", attrs = {}, skills = {}, weapons = {}, secondary = {},
             vitals = {hp = 0, hpMax = 0, bp = 200, bpMax = 200, dp = 0, dpMax = 0, tox = 0, toxMax = 0,
                       exhaustion = 0, staminaLost = 0, wounds = {light = 0, moderate = 0, mortal = 0}}}
  for _, a in ipairs(ATTRS) do d.attrs[a] = 10 end
  return d
end

---------------------------------------------------------------- rules (mirror of the web app)
local function skill(n) return tonumber(data.skills[n]) or 0 end
local function attr(a) return tonumber(data.attrs[a]) or 0 end
-- Attributes run 0–20 with 10 as the median; below 10 is "broken".
-- An attribute can rise at most 10 above where it started, never past 20.
local function attrBase(a)
  data.attrBases = data.attrBases or {}
  if data.attrBases[a] == nil then data.attrBases[a] = attr(a) end
  return tonumber(data.attrBases[a]) or 0
end
local function attrCap(a) return math.min(20, attrBase(a) + 10) end
-- A skill can hold one point for each point its attribute has above 10 (none if broken).
local function skillCapFor(a) return math.max(0, math.min(10, attr(a) - 10)) end
local function capMessage(name, a, color)
  local cap = skillCapFor(a)
  if cap == 0 then
    broadcastToColor(name .. " needs " .. ATTR_NAMES[a] .. " above 10 before it can take any points.", color, {0.9, 0.7, 0.3})
  else
    broadcastToColor(name .. " can hold " .. cap .. " point" .. (cap > 1 and "s" or "") .. " with " .. ATTR_NAMES[a] .. " at " .. attr(a) .. ".", color, {0.9, 0.7, 0.3})
  end
end
local BROKEN = {0.62, 0.13, 0.11, 1}       -- red pips for a broken attribute
local BOUGHT = {0.55, 0.36, 0.09, 1}       -- brass pips for points bought with Karma
local BROKEN_TEXT = {1, 0.58, 0.52, 1}
local function clamp(v, lo, hi) return math.max(lo, math.min(hi, v)) end

local function recompute()
  local v = data.vitals
  local endu = clamp(attr("END"), 0, 20)
  v.hpMax  = 2 * endu + 4 * skill("Durability")
  v.bpMax  = math.min(400, 200 + 20 * skill("Bleed Resistance"))
  v.dpMax  = 4 * endu + 12 * skill("Deprivation")
  v.toxMax = endu + 2 * skill("Belly")
  v.hp = clamp(tonumber(v.hp) or v.hpMax, 0, v.hpMax)
  v.bp = clamp(tonumber(v.bp) or v.bpMax, 0, v.bpMax)
  v.dp = clamp(tonumber(v.dp) or v.dpMax, 0, v.dpMax)
  v.tox = math.max(0, tonumber(v.tox) or 0)
  data.move = 10 + skill("Tumble")
end

---------------------------------------------------------------- button helpers
function cw_noop() end

local function add(params)
  params.click_function = params.click_function or "cw_noop"
  params.function_owner = self
  params.color = params.color or CLEAR
  params.hover_color = params.hover_color or (params.click_function == "cw_noop" and CLEAR or HOVER)
  params.press_color = params.press_color or HOVER
  params.font_color = params.font_color or INK
  self.createButton(params)
  local i = nextIndex
  nextIndex = nextIndex + 1
  return i
end

local function text(key, label, xf, yf, wf, scale, color)
  btn[key] = add({label = label, position = at(xf, yf), rotation = {0, 0, 0},
    width = 0, height = 0, font_size = sizeZ(0.022) * (scale or 1), font_color = color or INK})
end

local function setLabel(key, label, color)
  if btn[key] == nil then return end
  local p = {index = btn[key], label = label}
  if color then p.font_color = color end
  self.editButton(p)
end

-- Pips are drawn as small coloured squares inside the printed circles:
-- TTS's button font has no circle characters, but a button's own colour always shows.
local function setPip(key, color)
  if btn[key] == nil then return end
  self.editButton({index = btn[key], color = color or CLEAR})
end
local PIP = 0.70   -- square side as a share of the printed circle (fits inside it)

---------------------------------------------------------------- pips
local function makePip(key, xf, yf, diam, tooltip, onClick)
  local fname = "cw_pip_" .. key:gsub("[^%w]", "_")
  _G[fname] = function(obj, color, alt)
    if locked then broadcastToColor("This sheet is locked. Click Unlock to change it.", color, {0.9, 0.7, 0.3}) return end
    onClick(color, alt)
  end
  btn[key] = add({click_function = fname, label = "", tooltip = tooltip, position = at(xf, yf),
    width = sizeX(diam * PIP), height = sizeZ(diam * PIP), font_size = 1})
end

local function buildPips()
  -- attributes: the printed pips are display only.
  -- Strong (above 10): pips fill from the left, one per point above 10.
  -- Broken (below 10): pips fill red from the right, one per point missing.
  -- The readout and −/+ buttons sit just off the card's right edge.
  for r, a in ipairs(ATTRS) do
    for i = 1, 10 do
      btn["attr_" .. a .. "_" .. i] = add({label = "", position = at(ATTR_COLS[i], ATTR_ROWS[r]),
        width = sizeX(0.01143 * PIP), height = sizeZ(0.01143 * PIP), font_size = 1})
    end
    btn["attr_read_" .. a] = add({label = "", position = at(1.003, ATTR_ROWS[r]), width = sizeX(0.034), height = sizeZ(0.0105),
      font_size = sizeZ(0.0095), color = PANEL_BG, hover_color = PANEL_BG, font_color = PANEL_INK})
    for _, dir in ipairs({-1, 1}) do
      local fname = "cw_attr_" .. a .. (dir < 0 and "_dn" or "_up")
      _G[fname] = function(obj, color, alt)
        if not data then return end
        if locked then broadcastToColor("This sheet is locked. Click Unlock to change it.", color, {0.9, 0.7, 0.3}) return end
        local to = attr(a) + dir
        if to > attrCap(a) then
          broadcastToColor(ATTR_NAMES[a] .. " can rise at most 10 above its starting " .. attrBase(a) .. ", so " .. attrCap(a) .. " is its ceiling.", color, {0.9, 0.7, 0.3})
          return
        end
        data.attrs[a] = clamp(to, 0, 20)
        recompute(); refresh()
      end
      btn[fname] = add({click_function = fname, label = dir < 0 and "-" or "+", position = at(dir < 0 and 0.9785 or 1.0275, ATTR_ROWS[r]),
        width = sizeX(0.0125), height = sizeZ(0.0105), font_size = sizeZ(0.0105), color = {0.25, 0.23, 0.21, 1},
        hover_color = {0.55, 0.36, 0.09, 1}, font_color = PANEL_INK, tooltip = (dir < 0 and "Lower " or "Raise ") .. ATTR_NAMES[a]})
    end
  end
  -- skills
  for b, block in ipairs(SKILL_LAYOUT) do
    local cols, rows, names = block[1], block[2], block[3]
    local a = BLOCK_ATTR[b]
    for r, n in ipairs(names) do
      for i = 1, 10 do
        makePip("sk_" .. n .. "_" .. i, cols[i], rows[r], 0.0058, n .. " " .. i, function(color)
          local cur = skill(n)
          local to = (cur == i) and i - 1 or i
          if to > cur and to > skillCapFor(a) then capMessage(n, a, color) return end
          data.skills[n] = to
          recompute(); refresh()
        end)
      end
    end
  end
  -- weapon lines (top 4 weapon skills)
  for r = 1, 4 do
    text("weap_name_" .. r, "", 0.7680, WEAP_ROWS[r] - 0.0015, 0.06, 0.62)
    for i = 1, 10 do
      makePip("weap_" .. r .. "_" .. i, WEAP_COLS[i], WEAP_ROWS[r], 0.0058, "Weapon skill " .. i, function(color)
        local row = data.weapons[r]
        if not row then return end
        local to = (row[2] == i) and i - 1 or i
        local a = WEAPON_ATTR[row[1]]
        if a and to > (row[2] or 0) and to > skillCapFor(a) then capMessage(row[1], a, color) return end
        row[2] = to
        refresh()
      end)
    end
  end
  -- secondary lines (top 6)
  for r = 1, 6 do
    text("sec_name_" .. r, "", 0.7690, SEC_ROWS[r] - 0.0015, 0.06, 0.62)
    for i = 1, 3 do
      makePip("sec_" .. r .. "_" .. i, SEC_COLS[i], SEC_ROWS[r], 0.0091, "Secondary " .. i, function()
        local row = data.secondary[r]
        if not row then return end
        row[2] = (row[2] == i) and i - 1 or i
        refresh()
      end)
    end
  end
end

---------------------------------------------------------------- vitals panel (beside the card)
local VITALS = {
  {"hp",          "Hit points",   "hpMax"},
  {"bp",          "Blood",        "bpMax"},
  {"dp",          "Deprivation",  "dpMax"},
  {"tox",         "Toxicity",     "toxMax"},
  {"exhaustion",  "Exhaustion",   10},
  {"staminaLost", "Stamina lost", 10},
  {"light",       "Light wounds", nil},
  {"moderate",    "Mod. wounds",  nil},
  {"mortal",      "Mortal wounds", nil},
}
local PANEL_X = 1.06      -- image fraction to the right of the card
local PANEL_Y0, PANEL_DY = 0.40, 0.042   -- below the attribute readouts

local function vget(k)
  if k == "light" or k == "moderate" or k == "mortal" then return tonumber(data.vitals.wounds[k]) or 0 end
  return tonumber(data.vitals[k]) or 0
end
local function vset(k, val)
  if k == "light" or k == "moderate" or k == "mortal" then data.vitals.wounds[k] = math.max(0, val) return end
  local spec
  for _, s in ipairs(VITALS) do if s[1] == k then spec = s end end
  local max = spec[3]
  if type(max) == "string" then max = data.vitals[max] end
  if k == "tox" then max = (data.vitals.toxMax or 0) * 3 end
  data.vitals[k] = clamp(val, 0, max or 999)
end

local function buildPanel()
  btn.panel_bg = add({label = "", position = at(PANEL_X + 0.045, PANEL_Y0 + 4.2 * PANEL_DY, 0.12),
    width = sizeX(0.155), height = sizeZ(PANEL_DY * 10.4), color = PANEL_BG, hover_color = PANEL_BG})
  text("panel_title", "VITALS", PANEL_X + 0.045, PANEL_Y0 - 0.8 * PANEL_DY, 0.1, 0.9, PANEL_INK)
  for r, s in ipairs(VITALS) do
    local k, y = s[1], PANEL_Y0 + (r - 1) * PANEL_DY
    text("v_lbl_" .. k, s[2], PANEL_X + 0.045, y - 0.012, 0.12, 0.5, {0.7, 0.67, 0.62, 1})
    text("v_val_" .. k, "0", PANEL_X + 0.045, y + 0.008, 0.06, 0.95, PANEL_INK)
    for _, dir in ipairs({-1, 1}) do
      local fname = "cw_v_" .. k .. (dir < 0 and "_dn" or "_up")
      _G[fname] = function(obj, color, alt)
        if not data then return end
        vset(k, vget(k) + dir * (alt and 5 or 1))
        refreshPanel()
      end
      btn[fname] = add({click_function = fname, label = dir < 0 and "-" or "+", position = at(PANEL_X + (dir < 0 and -0.005 or 0.095), y + 0.008),
        width = sizeX(0.022), height = sizeZ(0.016), font_size = sizeZ(0.018), color = {0.25, 0.23, 0.21, 1},
        hover_color = {0.55, 0.36, 0.09, 1}, font_color = PANEL_INK,
        tooltip = (dir < 0 and "Lower " or "Raise ") .. s[2] .. " (right-click: 5)"})
    end
  end
  text("v_move", "", PANEL_X + 0.045, PANEL_Y0 + 9.05 * PANEL_DY, 0.12, 0.55, PANEL_INK)
end

---------------------------------------------------------------- controls (below the card)
local CTRL_Y = 1.025
local function control(key, label, xf, fname, tip)
  btn[key] = add({click_function = fname, label = label, position = at(xf, CTRL_Y), tooltip = tip,
    width = sizeX(0.078), height = sizeZ(0.016), font_size = sizeZ(0.0115), color = {0.12, 0.11, 0.10, 1},
    hover_color = {0.55, 0.36, 0.09, 1}, font_color = PANEL_INK})
end

local function buildControls()
  control("c_load", "Load code", 0.54, "cw_open_load", "Paste a code from the Clockwork Companion web app")
  control("c_export", "Export", 0.635, "cw_open_export", "Get a code to paste back into the web app")
  control("c_lock", "Lock", 0.73, "cw_toggle_lock", "Stop accidental pip clicks")
  control("c_cal", calibrating and "Done" or "Calibrate", 0.825, "cw_calibrate", "Line the pips up with the printed circles")
  control("c_clear", "Clear", 0.92, "cw_clear_ask", "Wipe this sheet")
end

local codeValue = ""
local function closeCode() codeOpen = nil codeValue = "" rebuild() end
local function openCode(mode, value) codeOpen = mode codeValue = value or "" pastedCode = codeValue rebuild() end

function cw_code_typed(obj, color, value, stillEditing) pastedCode = value end

-- The code box and its buttons are added last by rebuild(), so nothing else shifts.
local function buildCodeBox()
  self.createInput({input_function = "cw_code_typed", function_owner = self,
    label = codeOpen == "load" and "Paste the character code here" or "",
    value = codeValue, position = at(0.7265, CTRL_Y + 0.055), width = sizeX(0.46), height = sizeZ(0.07),
    font_size = sizeZ(0.0085), alignment = 2, color = {0.95, 0.94, 0.92, 1}, font_color = INK, tab = 1})
  if codeOpen == "load" then
    add({click_function = "cw_apply_code", label = "Apply", position = at(0.62, CTRL_Y + 0.105),
      width = sizeX(0.085), height = sizeZ(0.016), font_size = sizeZ(0.0125), color = {0.55, 0.36, 0.09, 1}, font_color = {1, 0.97, 0.92, 1}})
  end
  add({click_function = "cw_close_code", label = "Close", position = at(0.83, CTRL_Y + 0.105),
    width = sizeX(0.085), height = sizeZ(0.016), font_size = sizeZ(0.0125), color = {0.12, 0.11, 0.10, 1}, font_color = PANEL_INK})
end

function cw_open_load(obj, color) openCode("load", "") end
function cw_close_code() closeCode() end

function cw_apply_code(obj, color)
  local ok, parsed = pcall(function() return JSON.decode(pastedCode) end)
  if not ok or type(parsed) ~= "table" or parsed.cw ~= 1 then
    broadcastToColor("That isn't a complete Clockwork code. Copy it again from the web app's Tabletop tab.", color, {1, 0.5, 0.4})
    return
  end
  data = parsed
  data.attrs = data.attrs or {}
  data.skills = data.skills or {}
  data.weapons = data.weapons or {}
  data.secondary = data.secondary or {}
  data.attrBases = data.attrBases or {}
  data.vitals = data.vitals or blank().vitals
  data.vitals.wounds = data.vitals.wounds or {light = 0, moderate = 0, mortal = 0}
  recompute()
  closeCode()
  broadcastToAll((data.name ~= "" and data.name or "Character") .. " is on the table.", {0.85, 0.7, 0.4})
end

function cw_open_export(obj, color)
  if not data then broadcastToColor("Load a character first.", color, {1, 0.5, 0.4}) return end
  local code = JSON.encode(data)
  openCode("export", code)
  broadcastToColor("Select all the text in the box (Ctrl+A), copy it (Ctrl+C), then paste it into the web app's Tabletop tab.", color, {0.85, 0.7, 0.4})
end

function cw_toggle_lock(obj, color)
  locked = not locked
  setLabel("c_lock", locked and "Unlock" or "Lock")
  broadcastToColor(locked and "Sheet locked." or "Sheet unlocked.", color, {0.85, 0.7, 0.4})
end

local clearArmed = false
function cw_clear_ask(obj, color)
  if not clearArmed then
    clearArmed = true
    setLabel("c_clear", "Confirm clear")
    Wait.time(function() clearArmed = false setLabel("c_clear", "Clear") end, 4)
    return
  end
  clearArmed = false
  data = nil
  codeOpen = nil
  self.setDecals({})
  rebuild()
end

function cw_calibrate(obj, color)
  calibrating = not calibrating
  rebuild()
  if calibrating then
    broadcastToColor("Line up the four gold squares with: Strength's first attribute circle, Presence's last attribute circle, the first Maim circle and the last secondary-skill circle. Use Mirror or Flip if they're on the wrong side, Smaller or Bigger until each square just fits inside its circle, then click Done.", color, {0.85, 0.7, 0.4})
  else
    broadcastToColor("Calibration saved with this sheet.", color, {0.85, 0.7, 0.4})
  end
end
function cw_cal_mirror() cfg.flipX = not cfg.flipX rebuild() end
function cw_cal_flip() cfg.flipZ = not cfg.flipZ rebuild() end
function cw_cal_smaller() cfg.scale = math.max(50, math.floor(cfg.scale * 0.85 + 0.5)) rebuild() end
function cw_cal_bigger() cfg.scale = math.min(5000, math.floor(cfg.scale / 0.85 + 0.5)) rebuild() end

local function buildCalibration()
  local GOLD = {0.95, 0.62, 0.08, 0.8}
  for _, spot in ipairs({{ATTR_COLS[1], ATTR_ROWS[1], 0.01143}, {ATTR_COLS[10], ATTR_ROWS[7], 0.01143},
                         {LEFT_COLS[1], 0.47407, 0.0058}, {SEC_COLS[3], SEC_ROWS[6], 0.0091}}) do
    add({label = "", position = at(spot[1], spot[2]), width = sizeX(spot[3] * PIP), height = sizeZ(spot[3] * PIP),
      font_size = 1, color = GOLD, hover_color = GOLD})
  end
  local y = CTRL_Y + 0.045
  local function tool(label, xf, fname, tip)
    add({click_function = fname, label = label, position = at(xf, y), tooltip = tip,
      width = sizeX(0.078), height = sizeZ(0.016), font_size = sizeZ(0.0115), color = {0.55, 0.36, 0.09, 1},
      hover_color = {0.75, 0.5, 0.15, 1}, font_color = {1, 0.97, 0.92, 1}})
  end
  tool("Mirror L/R", 0.54, "cw_cal_mirror", "Swap left and right")
  tool("Flip U/D", 0.635, "cw_cal_flip", "Swap top and bottom")
  tool("Smaller", 0.73, "cw_cal_smaller", "Shrink every button")
  tool("Bigger", 0.825, "cw_cal_bigger", "Grow every button")
  add({label = "Size " .. cfg.scale, position = at(0.92, y), width = 0, height = 0, font_size = sizeZ(0.0115), font_color = PANEL_INK})
end

---------------------------------------------------------------- render
local function nameOrBlank(s) return (s and s ~= "") and s or "" end

function refreshPanel()
  if not data then return end
  local v = data.vitals
  local function show(k, val, max, warn)
    setLabel("v_val_" .. k, max and (val .. " / " .. max) or tostring(val), warn and {1, 0.55, 0.5, 1} or PANEL_INK)
  end
  show("hp", v.hp, v.hpMax, v.hp == 0)
  show("bp", v.bp, v.bpMax, v.bp <= 100)
  show("dp", v.dp, v.dpMax, v.dp <= 25)
  show("tox", v.tox, v.toxMax, v.tox > v.toxMax)
  show("exhaustion", v.exhaustion or 0, 10, (v.exhaustion or 0) >= 5)
  show("staminaLost", v.staminaLost or 0, 10, (v.staminaLost or 0) >= 5)
  local bleed = 8 * vget("light") + 14 * vget("moderate") + 20 * vget("mortal")
  show("light", vget("light")); show("moderate", vget("moderate")); show("mortal", vget("mortal"), nil, bleed > 0)
  setLabel("v_move", "Move " .. (data.move or 10) .. " m" .. (bleed > 0 and ("  |  bleeding " .. bleed) or ""))
end

function refresh()
  if not data then return end
  for _, f in ipairs(TEXT_FIELDS) do
    local k = f[1]
    if k == "karma" or k == "pool" then setLabel("t_" .. k, tostring(data[k] or 0))
    else setLabel("t_" .. k, nameOrBlank(data[k])) end
  end
  for _, a in ipairs(ATTRS) do
    local v, base = attr(a), attrBase(a)
    for i = 1, 10 do
      local key = "attr_" .. a .. "_" .. i
      if v >= 10 and i <= v - 10 then
        setPip(key, (10 + i > base) and BOUGHT or INK)    -- strong: fill from the left
      elseif v < 10 and i > v then
        setPip(key, BROKEN)                               -- broken: the missing points, from the right
      else
        setPip(key, nil)
      end
    end
    local d = v - 10
    setLabel("attr_read_" .. a, v .. (d < 0 and ("  (" .. d .. ")") or d > 0 and ("  (+" .. d .. ")") or ""), d < 0 and BROKEN_TEXT or PANEL_INK)
  end
  for _, block in ipairs(SKILL_LAYOUT) do
    for _, n in ipairs(block[3]) do
      local v = skill(n)
      for i = 1, 10 do setPip("sk_" .. n .. "_" .. i, i <= v and INK or nil) end
    end
  end
  for r = 1, 4 do
    local row = data.weapons[r]
    setLabel("weap_name_" .. r, row and row[1] or "")
    for i = 1, 10 do setPip("weap_" .. r .. "_" .. i, (row ~= nil and i <= (row[2] or 0)) and INK or nil) end
  end
  for r = 1, 6 do
    local row = data.secondary[r]
    setLabel("sec_name_" .. r, row and row[1] or "")
    for i = 1, 3 do setPip("sec_" .. r .. "_" .. i, (row ~= nil and i <= (row[2] or 0)) and INK or nil) end
  end
  refreshPanel()
end

local function applyPortrait()
  if data and data.portrait and data.portrait ~= "" then
    local p = at(PORTRAIT.x, PORTRAIT.y, 0.131)
    self.setDecals({{name = "cw_portrait", url = data.portrait, position = p,
      rotation = {90, 180, 0}, scale = {PORTRAIT.w / UW * XW, PORTRAIT.h * ZH, 1}}})
  else
    self.setDecals({})
  end
end

function rebuild()
  self.clearButtons()
  self.clearInputs()
  btn = {}
  nextIndex = 0
  buildControls()
  setLabel("c_lock", locked and "Unlock" or "Lock")
  if calibrating then
    buildCalibration()
  elseif data then
    for _, f in ipairs(TEXT_FIELDS) do
      text("t_" .. f[1], "", f[2], f[3], f[4], f[5])
    end
    buildPips()
    buildPanel()
    applyPortrait()
    refresh()
  end
  if codeOpen then buildCodeBox() end
end

---------------------------------------------------------------- save / load
function onSave()
  return JSON.encode({data = data, locked = locked, cfg = cfg})
end

function onLoad(saved)
  if saved and saved ~= "" then
    local ok, s = pcall(function() return JSON.decode(saved) end)
    if ok and type(s) == "table" then
      data = s.data
      locked = s.locked or false
      if type(s.cfg) == "table" then
        cfg.flipX = s.cfg.flipX == true
        cfg.flipZ = s.cfg.flipZ == true
        cfg.scale = tonumber(s.cfg.scale) or cfg.scale
      end
    end
  end
  if data then recompute() end
  rebuild()
end
