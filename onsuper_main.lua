--[[
    ============================================================
    GTPS onSuperMain - Public OSM (Format IP RDP / cache /)
    ============================================================
    OSM LINK : http://172.232.228.96:3000/
    OSM PATH : 172.232.228.96:3000/cache/
    ============================================================
]]

local OSM_LINK = "http://172.232.228.96:3000/"
local OSM_PATH = "172.232.228.96:3000/cache/"
local ITEM_HASH = -302607019 -- Hash items.dat otomatis dari website

function onSuperMain(player)
    if not player then return end

    -- Kirim OnSuperMain ke game client
    if player.sendVariant then
        player:sendVariant({
            "OnSuperMainStartAcceptLogonHrdcronrxr",
            ITEM_HASH,
            OSM_LINK,
            OSM_PATH
        })
    end
end
