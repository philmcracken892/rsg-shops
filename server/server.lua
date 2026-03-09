local RSGCore = exports['rsg-core']:GetCoreObject()

-- Purchase handler
RegisterNetEvent('rsg-shops:server:purchase')
AddEventHandler('rsg-shops:server:purchase', function(shopName, items, total)
    local src = source
    local Player = RSGCore.Functions.GetPlayer(src)
    
    if not Player then 
        TriggerClientEvent('rsg-shops:client:purchaseFailed', src, 'Player not found')
        return 
    end
    
    if not items or #items == 0 then
        TriggerClientEvent('rsg-shops:client:purchaseFailed', src, 'No items in cart')
        return
    end
    
    -- Validate total
    local calculatedTotal = 0
    for _, item in ipairs(items) do
        if item.price and item.quantity then
            calculatedTotal = calculatedTotal + (item.price * item.quantity)
        end
    end
    
    -- Allow small floating point differences
    if math.abs(calculatedTotal - total) > 0.01 then
        TriggerClientEvent('rsg-shops:client:purchaseFailed', src, 'Invalid purchase total')
        return
    end
    
    -- Check if player has enough money
    local playerCash = Player.Functions.GetMoney('cash')
    if playerCash < total then
        TriggerClientEvent('rsg-shops:client:purchaseFailed', src, 'Insufficient funds')
        return
    end
    
    -- Remove money first
    local moneyRemoved = Player.Functions.RemoveMoney('cash', total, 'shop-purchase')
    if not moneyRemoved then
        TriggerClientEvent('rsg-shops:client:purchaseFailed', src, 'Could not process payment')
        return
    end
    
    -- Give items
    local itemsGiven = {}
    local failedItems = {}
    local refundAmount = 0
    
    for _, item in ipairs(items) do
        if item.name and item.quantity and item.quantity > 0 then
            local success = Player.Functions.AddItem(item.name, item.quantity)
            if success then
                table.insert(itemsGiven, item)
                -- Trigger inventory notification
                local itemInfo = RSGCore.Shared.Items[item.name]
                if itemInfo then
                    TriggerClientEvent('inventory:client:ItemBox', src, itemInfo, "add", item.quantity)
                end
            else
                -- Track failed items for refund
                table.insert(failedItems, item)
                refundAmount = refundAmount + (item.price * item.quantity)
            end
        end
    end
    
    -- Refund failed items
    if refundAmount > 0 then
        Player.Functions.AddMoney('cash', refundAmount, 'shop-refund')
        for _, item in ipairs(failedItems) do
            TriggerClientEvent('rsg-shops:client:notify', src, 'error', 'Inventory Full', 'Could not add ' .. (item.label or item.name))
        end
    end
    
    -- Check if any items were given
    if #itemsGiven == 0 then
        -- Full refund already happened above
        TriggerClientEvent('rsg-shops:client:purchaseFailed', src, 'Could not add any items to inventory')
        return
    end
    
    -- Log purchase
    local citizenid = Player.PlayerData.citizenid
    local firstname = Player.PlayerData.charinfo.firstname
    local lastname = Player.PlayerData.charinfo.lastname
    
    local itemList = {}
    for _, item in ipairs(itemsGiven) do
        table.insert(itemList, item.quantity .. 'x ' .. (item.label or item.name))
    end
    
    local actualTotal = total - refundAmount
    print('[rsg-shops] ' .. firstname .. ' ' .. lastname .. ' (' .. citizenid .. ') purchased: ' .. table.concat(itemList, ', ') .. ' for $' .. string.format("%.2f", actualTotal))
    
    -- Trigger success
    TriggerClientEvent('rsg-shops:client:purchaseSuccess', src, 'Thank you for your purchase!')
end)

-- Get item label helper
local function GetItemLabel(itemName)
    local item = RSGCore.Shared.Items[itemName]
    if item then
        return item.label
    end
    return itemName
end

-- Admin command to restock shop (optional)
RSGCore.Commands.Add('restockshop', 'Restock all shops (Admin Only)', {}, false, function(source, args)
    TriggerClientEvent('rsg-shops:client:notify', source, 'success', 'Shops Restocked', 'All shop inventories have been restocked')
end, 'admin')

-- Get shop data callback (optional - for dynamic stock)
RSGCore.Functions.CreateCallback('rsg-shops:server:getShopData', function(source, cb, shopName, products)
    local productList = Config.Products[products]
    if not productList then 
        cb({})
        return 
    end
    
    local items = {}
    for _, product in ipairs(productList) do
        table.insert(items, {
            name = product.name,
            label = GetItemLabel(product.name),
            price = product.price,
            amount = product.amount,
            type = product.type or 'item'
        })
    end
    
    cb(items)
end)

-- Get player money callback
RSGCore.Functions.CreateCallback('rsg-shops:server:getPlayerMoney', function(source, cb)
    local Player = RSGCore.Functions.GetPlayer(source)
    if not Player then 
        cb({ cash = 0, gold = 0 })
        return 
    end
    
    cb({
        cash = Player.Functions.GetMoney('cash'),
        gold = Player.Functions.GetMoney('gold') or 0
    })
end)