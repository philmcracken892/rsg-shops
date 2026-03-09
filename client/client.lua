local RSGCore = exports['rsg-core']:GetCoreObject()
local createdPrompts = {}
local blips = {}
local isShopOpen = false
local imagePath = "nui://rsg-inventory/html/images/"

-- Cleanup
AddEventHandler('onResourceStop', function(resourceName)
    if GetCurrentResourceName() == resourceName then
        for _, data in pairs(createdPrompts) do
            if data.prompt then
                PromptDelete(data.prompt)
            end
        end
        for _, blip in pairs(blips) do
            RemoveBlip(blip)
        end
        SetNuiFocus(false, false)
    end
end)

-- Create prompts and blips
CreateThread(function()
    for _, v in pairs(Config.StoreLocations) do
        local prompt = PromptRegisterBegin()
        PromptSetControlAction(prompt, RSGCore.Shared.Keybinds[Config.Keybind])
        PromptSetText(prompt, CreateVarString(10, 'LITERAL_STRING', 'Open ' .. v.label))
        PromptSetEnabled(prompt, false)
        PromptSetVisible(prompt, false)
        PromptSetHoldMode(prompt, true)
        PromptRegisterEnd(prompt)
        
        createdPrompts[v.name] = {
            prompt = prompt,
            coords = v.shopcoords,
            radius = v.radius or 3.0,
            products = v.products,
            name = v.name,
            label = v.label
        }
        
        if v.showblip == true then    
            local blip = BlipAddForCoords(1664425300, v.shopcoords)
            SetBlipSprite(blip, joaat(v.blipsprite), true)
            SetBlipScale(blip, v.blipscale)
            SetBlipName(blip, v.label)
            table.insert(blips, blip)
        end
    end
end)

-- Get player money
local function GetPlayerMoney()
    local playerData = RSGCore.Functions.GetPlayerData()
    if not playerData then return { cash = 0, gold = 0 } end
    
    return {
        cash = playerData.money and playerData.money.cash or 0,
        gold = playerData.money and playerData.money.gold or 0
    }
end

-- Get item data from shared items
local function GetItemData(itemName)
    local item = RSGCore.Shared.Items[itemName]
    if item then
        return {
            label = item.label,
            image = item.image or (itemName .. '.png'),
            type = item.type or 'item',
            description = item.description
        }
    end
    return {
        label = itemName:gsub("_", " "):gsub("(%a)([%w_']*)", function(a, b) return a:upper()..b:lower() end),
        image = itemName .. '.png',
        type = 'item',
        description = ''
    }
end

-- Prepare shop items with full data
local function PrepareShopItems(products)
    local productList = Config.Products[products]
    if not productList then return {} end
    
    local items = {}
    for _, product in ipairs(productList) do
        local itemData = GetItemData(product.name)
        table.insert(items, {
            name = product.name,
            label = itemData.label,
            image = itemData.image,
            price = product.price,
            amount = product.amount,
            type = itemData.type,
            description = itemData.description
        })
    end
    
    return items
end

-- Open shop
local function OpenShop(shopData)
    if isShopOpen then return end
    
    local playerData = RSGCore.Functions.GetPlayerData()
    if not playerData then return end
    
    local playerjobtype = playerData.job and playerData.job.type or ''
    
    if shopData.products == 'armoury' and playerjobtype ~= 'leo' then
        RSGCore.Functions.Notify('You must be law enforcement', 'error')
        return
    end
    
    if shopData.products == 'medic' and playerjobtype ~= 'medic' then
        RSGCore.Functions.Notify('You must be a medic', 'error')
        return
    end
    
    local items = PrepareShopItems(shopData.products)
    local money = GetPlayerMoney()
    
    isShopOpen = true
    SetNuiFocus(true, true)
    
    SendNUIMessage({
        action = 'open',
        shopName = shopData.name,
        shopLabel = shopData.label,
        items = items,
        playerMoney = money,
        imagePath = imagePath
    })
end

-- NUI Callbacks
RegisterNUICallback('closeShop', function(data, cb)
    isShopOpen = false
    SetNuiFocus(false, false)
    cb('ok')
end)

RegisterNUICallback('purchase', function(data, cb)
    if not data.items or #data.items == 0 then
        cb('ok')
        return
    end
    
    TriggerServerEvent('rsg-shops:server:purchase', data.shopName, data.items, data.total)
    cb('ok')
end)

RegisterNUICallback('refreshShop', function(data, cb)
    local shop = createdPrompts[data.shopName]
    if shop then
        local items = PrepareShopItems(shop.products)
        local money = GetPlayerMoney()
        
        SendNUIMessage({
            action = 'updateMoney',
            cash = money.cash,
            gold = money.gold
        })
        
        SendNUIMessage({
            action = 'updateItems',
            items = items
        })
    end
    cb('ok')
end)

-- Server events
RegisterNetEvent('rsg-shops:client:purchaseSuccess')
AddEventHandler('rsg-shops:client:purchaseSuccess', function(message)
    Wait(100) -- Small delay to ensure money is updated
    local money = GetPlayerMoney()
    
    SendNUIMessage({
        action = 'updateMoney',
        cash = money.cash,
        gold = money.gold
    })
    
    SendNUIMessage({
        action = 'purchaseSuccess',
        message = message
    })
end)

RegisterNetEvent('rsg-shops:client:purchaseFailed')
AddEventHandler('rsg-shops:client:purchaseFailed', function(message)
    SendNUIMessage({
        action = 'purchaseFailed',
        message = message
    })
end)

RegisterNetEvent('rsg-shops:client:notify')
AddEventHandler('rsg-shops:client:notify', function(type, title, message)
    SendNUIMessage({
        action = 'notify',
        type = type,
        title = title,
        message = message
    })
end)

-- Distance check thread
CreateThread(function()
    while true do
        local playerPed = PlayerPedId()
        local playerCoords = GetEntityCoords(playerPed)
        local sleep = 1000
        
        for _, shop in pairs(createdPrompts) do
            local distance = #(playerCoords - shop.coords)
            
            if distance <= shop.radius then
                sleep = 0
                PromptSetEnabled(shop.prompt, true)
                PromptSetVisible(shop.prompt, true)
                
                if PromptHasHoldModeCompleted(shop.prompt) then
                    OpenShop(shop)
                end
            else
                PromptSetEnabled(shop.prompt, false)
                PromptSetVisible(shop.prompt, false)
            end
        end
        
        Wait(sleep)
    end
end)

-- Update player data event (for money changes)
RegisterNetEvent('RSGCore:Client:OnMoneyChange')
AddEventHandler('RSGCore:Client:OnMoneyChange', function(moneyType, amount, operation)
    if isShopOpen then
        Wait(100)
        local money = GetPlayerMoney()
        SendNUIMessage({
            action = 'updateMoney',
            cash = money.cash,
            gold = money.gold
        })
    end
end)