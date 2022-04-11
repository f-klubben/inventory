function prettyProdProp(product, index, prop) {
    if (product.inventory_size[index] === undefined)
        return ""
    return product.inventory_size[index][prop]
}

function addProductRow(prod) {
    $('#products tbody').append($('<tr>')
        .append($('<td>').attr('contenteditable', true).attr('data-picture', prod.picture).text(prod.name))
        .append($('<td>').attr('contenteditable', true).text(prettyProdProp(prod, 0, 'name')))
        .append($('<td>').attr('contenteditable', true).attr('data-type', 'barcode').text(prettyProdProp(prod, 0, 'barcode')))
        .append($('<td>').attr('contenteditable', true).addClass('right').text(prettyProdProp(prod, 0, 'quantity')))
        .append($('<td>').attr('contenteditable', true).text(prettyProdProp(prod, 1, 'name')))
        .append($('<td>').attr('contenteditable', true).attr('data-type', 'barcode').text(prettyProdProp(prod, 1, 'barcode')))
        .append($('<td>').attr('contenteditable', true).addClass('right').text(prettyProdProp(prod, 1, 'quantity')))
        .append($('<td>').attr('contenteditable', true).text(prettyProdProp(prod, 2, 'name')))
        .append($('<td>').attr('contenteditable', true).attr('data-type', 'barcode').text(prettyProdProp(prod, 2, 'barcode')))
        .append($('<td>').attr('contenteditable', true).addClass('right').text(prettyProdProp(prod, 2, 'quantity')))
    )
}

function newEmptyProductRow() {
    $('#products tbody').append($('<tr>')
        .append($('<td>').attr('contenteditable', true).text('New row'))
        .append($('<td>').attr('contenteditable', true))
        .append($('<td>').attr('contenteditable', true).attr("data-type", "barcode"))
        .append($('<td>').attr('contenteditable', true).addClass('right'))
        .append($('<td>').attr('contenteditable', true))
        .append($('<td>').attr('contenteditable', true).attr("data-type", "barcode"))
        .append($('<td>').attr('contenteditable', true).addClass('right'))
        .append($('<td>').attr('contenteditable', true))
        .append($('<td>').attr('contenteditable', true).attr("data-type", "barcode"))
        .append($('<td>').attr('contenteditable', true).addClass('right'))
    )
}

let inventory_history = [];

function newEmptyInventoryRow(productname) {
    result = $('<tr>')
        .append($('<td>').text(productname))
        .append($('<td>').addClass('right').text(0))
        .append($('<td>').addClass('right').text(0))
        .append($('<td>').addClass('right').text(0))
        .append($('<td>'))
        .append($('<td>').text(0))
    $('#inventory tbody').prepend(result)
    return result
}

function generateBarcodes() {
    let products = getProducts();
    products.sort(function(a, b) {
        return a.name.localeCompare(b.name);
    })
    elems = products.map(function(el) {
        elem = $('<tr>')
            .append($('<td>').text(el.name))
        for (var i = 0; i < el.inventory_size.length; i++) {
            elem.append($('<td>'))
            let inv = el.inventory_size[i];
            if (!inv.name)
                continue
            barcode_format = "auto"
            if (inv.barcode.length == 13)
                barcode_format = "EAN13"
            if (inv.barcode.length == 8)
                barcode_format = "EAN8"
            elem.children().last()
                .append($('<span>').text(`${inv.name} (Antal: ${inv.quantity})`)).append($('<br>'))
                //.append($('<span>').text("Antal: "+ inv.quantity)).append($('<br>'))
                .append($('<canvas>')
                    .addClass('barcode')
                    .attr('jsbarcode-value', inv.barcode)
                    .attr('jsbarcode-format', barcode_format)
                )
        }
        return elem;
    })
    $('#barcodes tbody').empty().append(elems)
    JsBarcode('.barcode').options({
        width: 2,
        flat: true,
        height: 50,
        margin: 5,
        fontSize: 15
    }).init()
}

function getProducts() {
    return $('#products > tbody > tr').map(function() {
        let name = $(this).children().first().text();
        if (name == "")
            return null
        inv = $(this).children('[data-type="barcode"]').map(function() {

            quantity = $(this).next().text()
            return { "name": $(this).prev().text(), "barcode": $(this).text(), "quantity": parseInt(quantity) || quantity }
        }).toArray()
        return { "name": $(this).children().first().text(), "inventory_size": inv }
    }).toArray()
}

function updateInventorySummary() {
    let products = getProducts()
    $('#inventory tbody tr').each(function() {
        product = products.find((e) => e.name == $(this).children().first().text());
        if (product == undefined) {
            console.log('Didnt find product :(');
            return
        }
        //Map each to an array (quantity x size) and join with ", "
        summaryarr = [1, 2, 3].map((i) => {
            el = $(this).children().eq(i).text();
            if (el == "0")
                return null
            inv = product.inventory_size[i - 1].name;
            return `${el} x ${inv}`
        })
        $(this).children().eq(4).text(summaryarr.filter((e) => { return e != null; }).join(', '))
    })
}

let flash_timer = 0

function flash(cssclass) {
    const flash_duration_ms = 1000;
    const body = $("body").addClass(cssclass);
    clearTimeout(flash_timer);
    flash_timer = window.setTimeout(function() {
        body.removeClass(cssclass)
    }, flash_duration_ms);

}

function undo_scan() {
    if (inventory_history.length === 0)
        return
    prodinfo = inventory_history.pop()


    inventoryElement = $('#inventory tbody tr').filter(function() {
        return $(this).children('td').eq(0).text() === prodinfo.name
    })
    quantityCell = inventoryElement.children('td').eq(prodinfo.quantityIndex + 1);
    quantityCell.text(parseInt(quantityCell.text()) - 1)

    updateInventorySummary()

    totalCell = inventoryElement.children('td').eq(-1)
    totalCell.text(parseInt(totalCell.text()) - prodinfo.quantity)

    appendTolog(`Undid ${prodinfo.name}, ${prodinfo.sizename} for ${prodinfo.quantity}`)
}

function handleBarcodeInput(e) {
    let searchValue = e.target.value.trim()
    if (searchValue === "")
        return
    let success;

    productElement = $("#products td[data-type='barcode']").filter(function() {
        return $(this).text().trim() === searchValue;
    }).first()

    if (!productElement.length) {
        success = false
        appendTolog(`Unknown barcode ${searchValue}!`)
    } else {
        prodinfo = {
            "name": productElement.parent().children().first().text(),
            "picture": productElement.parent().children().first().attr('data-picture'),
            "sizename": productElement.prev().text(),
            "quantity": parseInt(productElement.next().text()),
            "quantityIndex": Math.floor((productElement.index() - 1) / 3),
        }

        inventoryElement = $('#inventory tbody tr').filter(function() {
            return $(this).children('td').eq(0).text() === prodinfo.name
        })

        if (!inventoryElement.length) {
            inventoryElement = newEmptyInventoryRow(prodinfo.name)
        }
        quantityCell = inventoryElement.children('td').eq(prodinfo.quantityIndex + 1);
        quantityCell.text(parseInt(quantityCell.text()) + 1)

        updateInventorySummary()

        totalCell = inventoryElement.children('td').eq(-1)
        newTotal = parseInt(totalCell.text()) + prodinfo.quantity
        totalCell.text(newTotal)
        success = true;

        inventory_history.push(prodinfo)

        $('#product-name').text(prodinfo.name + ", Total: " + newTotal)
        console.log(prodinfo.picture)
        if (prodinfo.picture)
            $('#product-img').attr('src', prodinfo.picture)


        log_str = `Scanned ${searchValue}, ${prodinfo.name}, ${prodinfo.sizename} for an additional ${prodinfo.quantity}`
        appendTolog(log_str)
    }

    if (success === true) {
        flash('scan-success')
    } else {
        flash('scan-error')
    }
    e.target.value = ""
}

function appendTolog(str) {
    let elem = $("#history_log")
    elem.text(str + "\n" + elem.text())
}

function downloadInventoryCsv() {
    csv = []
    // csv header
    csv.push($("#inventory thead tr th").map(function() {
        return $(this).text()
    }).toArray())
    // csv values
    $('#inventory tbody tr').each(function(index, el) {
        csv.push($(this).children('td').map(function() {
            return $(this).text()
        }).toArray())
    });
    let csvContent = "data:text/csv;charset=utf-8," + csv.map(e => e.join(";")).join("\n");
    var encodedUri = encodeURI(csvContent);

    link = $('<a>').attr('href', encodedUri).attr('download', 'fklub_inventory.csv')[0];


    document.body.appendChild(link); // Required for FF

    link.click();
    document.body.removeChild(link)
}

function resetInventory() {
    if (window.confirm("Are you sure that you want to reset the inventory?")) {
        $('#inventory tbody').empty()
    }
}

function sampleProducts() {
    return [
        { "name": "Ale No 16 33 cl", "inventory_size": [{ "name": "Styk", "barcode": "57109640", "quantity": 1 }, { "name": "5 stk", "barcode": "5709216062004", "quantity": 5 }, { "name": "Kasse", "barcode": "5709216062509", "quantity": 30 }], "picture": "img/ale_no_16_33_cl.png" },
        { "name": "Carlsberg SPORT 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "57045504", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600984915", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600984526" }], "picture": "img/carlsberg_sport_50_cl.png" },
        { "name": "Chocopulver", "inventory_size": [{ "name": "Styk", "barcode": "7350022392311", "quantity": 1 }, { "name": "Kasse", "quantity": 10, "barcode": "15701025290217" }], "picture": "img/chocopulver.png" },
        { "name": "Coca-Cola CHERRY 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "57045580", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600984991", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600984502" }, "picture": "img/coca-cola_cherry_50_cl.png" },
        { "name": "Coca-Cola ORIGINAL TASTE 150 cl", "inventory_size": [{ "name": "Styk", "barcode": "57045795", "quantity": 1 }, { "name": "Kasse", "quantity": 8, "barcode": "5740600984243" }], "picture": "img/coca-cola_original_taste_150_cl.png" },
        { "name": "Coca-Cola ORIGINAL TASTE 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "57045399", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600984106", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600984632" }, "picture": "img/coca-cola_original_taste_50_cl.png" },
        { "name": "Coca-Cola ZERO SUGAR 150 cl", "inventory_size": [{ "name": "Styk", "barcode": "57095967", "quantity": 1 }, { "name": "Kasse", "quantity": 8, "barcode": "5740600978341" }], "picture": "img/coca-cola_zero_sugar_150_cl.png" },
        { "name": "Coca-Cola ZERO SUGAR 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "57095936", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600978839", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600978389" }, "picture": "img/coca-cola_zero_sugar_50_cl.png" },
        { "name": "Cocio Classic 60 cl", "inventory_size": [{ "name": "Styk", "barcode": "5730800523601", "quantity": 1 }, { "name": "Kasse", "quantity": 10, "barcode": "5730800623899" }, "picture": "img/cocio_classic_60_cl.png" },
        { "name": "Fanta Exotic 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "57045443", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600984878", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600984465" }, "picture": "img/fanta_exotic_50_cl.png" },
        { "name": "Faxe-Kondi 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5741000124024", "quantity": 1 }, { "name": "4 stk", "barcode": "5741000162194", "quantity": 4 }, { "name": "Kasse", "barcode": "5741000162606", "quantity": 24 }], "picture": "img/faxe-kondi_50_cl.png" },
        { "name": "Faxe-Kondi Free 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5741000129395", "quantity": 1 }, { "name": "4 stk", "barcode": "5741000163924", "quantity": 4 }, { "name": "Kasse", "barcode": "5741000163023", "quantity": 24 }], "picture": "img/faxe-kondi_free_50_cl.png" },
        { "name": "Fuze Tea Peach 40 cl", "inventory_size": [{ "name": "Styk", "barcode": "57088853", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600982102", "quantity": 4 }, { "name": "Kasse", "quantity": 12, "barcode": "5740600982904" }], "picture": "img/fuze_tea_peach_40_cl.png" },
        { "name": "Fuze Tea Peach Hibiscus 40 cl", "inventory_size": [{ "name": "Styk", "barcode": "57088808", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600982225", "quantity": 4 }, { "name": "Kasse", "quantity": 12, "barcode": "5740600982881" }], "picture": "img/fuze_tea_peach_hibiscus_40_cl.png" },
        { "name": "Kaffebønner", "inventory_size": [{ "name": "Styk", "barcode": "8711000473726", "quantity": 1 }, { "name": "Kasse", "quantity": 8, "barcode": "8711000473733" }], "picture": "img/kaffeboenner.png" },
        { "name": "Kildevæld 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "57095370", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600979287", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600979874" }, "picture": "img/kildevaeld_50_cl.png" },
        { "name": "Kildevæld Citron & Hyldeblomst 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "57095387", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600979287", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600979867" }, "picture": "img/kildevaeld_citron_and_hyldeblomst_50_cl.png" },
        { "name": "Kildevæld Glow Peach Blossom 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "57096063", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600977290", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600977924" }, "picture": "img/kildevaeld_glow_peach_blossom_50_cl.png" },
        { "name": "Kildevæld Hindbær & Brombær 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "57095424", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600979294", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600979829" }, "picture": "img/kildevaeld_hindbaer_and_brombaer_50_cl.png" },
        { "name": "Kinley Hindbærvand 25 cl", "inventory_size": [{ "name": "Styk", "barcode": "54491892", "quantity": 1 }, { "name": "5 stk", "barcode": "5740700632280", "quantity": 5 }, { "name": "Kasse", "quantity": 30, "barcode": "5740700632419" }, "picture": "img/kinley_hindbaervand_25_cl.png" },
        { "name": "Limfjordsporter 33 cl", "inventory_size": [{ "name": "Styk", "barcode": "57040189", "quantity": 1 }, { "name": "5 stk", "barcode": "5709216008828", "quantity": 5 }, { "name": "Kasse", "barcode": "5709216008507", "quantity": 30 }], "picture": "img/limfjordsporter_33_cl.png" },
        { "name": "Monster Energy 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060337502900", "quantity": 1 }, { "name": "4 stk", "barcode": "5060337502016", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5060337502917" }, "picture": "img/monster_energy_50_cl.png" },
        { "name": "Monster Energy Doctor Rossi 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060337503129", "quantity": 1 }, { "name": "4 stk", "barcode": "5060337503822", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5060337503136" }, "picture": "img/monster_energy_doctor_rossi_50_cl.png" },
        { "name": "Monster Energy Espresso Cream 25 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060639122417", "quantity": 1 }, { "name": "4 stk", "barcode": "5060639122882", "quantity": 4 }, { "name": "Kasse", "quantity": 12, "barcode": "5060639122424" }, "picture": "img/monster_energy_espresso_cream_25_cl.png" },
        { "name": "Monster Energy Espresso Vanilla 25 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060639122448", "quantity": 1 }, { "name": "4 stk", "barcode": "5060639122967", "quantity": 4 }, { "name": "Kasse", "quantity": 12, "barcode": "5060639122455" }, "picture": "img/monster_energy_espresso_vanilla_25_cl.png" },
        { "name": "Monster Energy Mango Loco 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060639120970", "quantity": 1 }, { "name": "4 stk", "barcode": "5060639120024", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5060639120987" }, "picture": "img/monster_energy_mango_loco_50_cl.png" },
        { "name": "Monster Energy Monarch 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060896620213", "quantity": 1 }, { "name": "4 stk", "barcode": "5060896620886", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5060896620220" }], "picture": "img/monster_energy_monarch_50_cl.png" },
        { "name": "Monster Energy Mule 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060751214069", "quantity": 1 }, { "name": "4 stk", "barcode": "5060751214953", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5060751214045" }, "picture": "img/monster_energy_mule_50_cl.png" },
        { "name": "Monster Energy Pacific Punch 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060751214106", "quantity": 1 }, { "name": "4 stk", "barcode": "5060751214922", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5060751214083" }, "picture": "img/monster_energy_pacific_punch_50_cl.png" },
        { "name": "Monster Energy Pipeline Punch 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060639125708", "quantity": 1 }, { "name": "4 stk", "barcode": "5060639125265", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5060639125692" }, "picture": "img/monster_energy_pipeline_punch_50_cl.png" },
        { "name": "Monster Energy Ultra 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060337502290", "quantity": 1 }, { "name": "4 stk", "barcode": "5060337502702", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5060337502306" }], "picture": "img/monster_energy_ultra_50_cl.png" },
        { "name": "Monster Energy Ultra Fiesta Mango 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060751215042", "quantity": 1 }, { "name": "4 stk", "barcode": "5060751215950", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5060751215059" }], "picture": "img/monster_energy_ultra_fiesta_mango_50_cl.png" },
        { "name": "Monster Energy Ultra Paradise 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060751210382", "quantity": 1 }, { "name": "4 stk", "barcode": "5060751210757", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5060751210368" }, "picture": "img/monster_energy_ultra_paradise_50_cl.png" },
        { "name": "Monster Energy Ultra Violet 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060639121236", "quantity": 1 }, { "name": "4 stk", "barcode": "5060639120277", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5060639120840" }, "picture": "img/monster_energy_ultra_violet_50_cl.png" },
        { "name": "Monster Energy Zero Sugar 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5060337503099", "quantity": 1 }, { "name": "4 stk", "barcode": "5060337503709", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5060337503105" }, "picture": "img/monster_energy_zero_sugar_50_cl.png" },
        { "name": "Mælkepulver", "inventory_size": [{ "name": "Styk", "barcode": "8711000668122", "quantity": 1 }, { "name": "Kasse", "quantity": 12, "barcode": "8711000668139" }], "picture": "img/maelkepulver.png" },
        { "name": "Pepsi Max 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "5741000124123", "quantity": 1 }, { "name": "4 stk", "barcode": "5741000156261", "quantity": 4 }, { "name": "Kasse", "barcode": "5741000156681", "quantity": 24 }], "picture": "img/pepsi_max_50_cl.png" },
        { "name": "Ramlösa Premium Citrus 33 cl", "inventory_size": [{ "name": "Styk", "barcode": "73102625", "quantity": 1 }, { "name": "4 stk", "barcode": "7310074004990", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "7310074004501" }, "picture": "img/ramloesa_premium_citrus_33_cl.png" },
        { "name": "Ramlösa Premium Original 33 cl", "inventory_size": [{ "name": "Styk", "barcode": "73102601", "quantity": 1 }, { "name": "4 stk", "barcode": "7310074004938", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "7310074004488" }, "picture": "img/ramloesa_premium_original_33_cl.png" },
        { "name": "Somersby Apple 33 cl", "inventory_size": [{ "name": "Styk", "barcode": "5740700992858", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600992231", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600992842" }, "picture": "img/somersby_apple_33_cl.png" },
        { "name": "Somersby Blackberry 33 cl", "inventory_size": [{ "name": "Styk", "barcode": "5740700985676", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600979126", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600979904" }, "picture": "img/somersby_blackberry_33_cl.png" },
        { "name": "Somersby Red Rhubarb 33 cl", "inventory_size": [{ "name": "Styk", "barcode": "5740700988226", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600985837", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600985097" }, "picture": "img/somersby_red_rhubarb_33_cl.png" },
        { "name": "Sport-Cola 33 cl", "inventory_size": [{ "name": "Styk", "barcode": "5709216007104", "quantity": 1 }, { "name": "5 stk", "barcode": "5709216007746", "quantity": 5 }, { "name": "Kasse", "barcode": "5709216007203", "quantity": 30 }], "picture": "img/sport-cola_33_cl.png" },
        { "name": "Sport-Cola Light 33 cl", "inventory_size": [{ "name": "Styk", "barcode": "5709216008804", "quantity": 1 }, { "name": "5 stk", "barcode": "5709216008255", "quantity": 5 }, { "name": "Kasse", "barcode": "5709216008903", "quantity": 30 }], "picture": "img/sport-cola_light_33_cl.png" },
        { "name": "Sukker", "inventory_size": [{ "name": "Styk", "barcode": "25044478", "quantity": 1 }], "picture": "img/sukker.png" },
        { "name": "Tuborg Classic 25 l Fustage", "inventory_size": [{ "name": "Styk", "barcode": "5740700607165", "quantity": 1 }, { "name": "Styk", "barcode": "5740700989216", "quantity": 1 }], "picture": "img/tuborg_classic_25_l_fustage.png" },
        { "name": "Tuborg Classic 33 cl flaske", "inventory_size": [{ "name": "Styk", "barcode": "57008165", "quantity": 1 }, { "name": "5 stk", "barcode": "5740700605673", "quantity": 5 }, { "name": "Kasse", "quantity": 30, "barcode": "5740700605055" }], "picture": "img/tuborg_classic_33_cl_flaske.png" },
        { "name": "Tuborg Grøn 25 l Fustage", "inventory_size": [{ "name": "Styk", "barcode": "5740700607035", "quantity": 1 }, { "name": "Styk", "quantity": 1, "barcode": "5740700996931" }], "picture": "img/tuborg_groen_25_l_fustage.png" },
        { "name": "Tuborg Grøn 33 cl flaske", "inventory_size": [{ "name": "Styk", "barcode": "57008004", "quantity": 1 }, { "name": "5 stk", "barcode": "5740700605383", "quantity": 5 }, { "name": "Kasse", "quantity": 30, "barcode": "5740700605024" }, "picture": "img/tuborg_groen_33_cl_flaske.png" },
        { "name": "Tuborg NUL 33 cl flaske", "inventory_size": [{ "name": "Styk", "barcode": "57095721", "quantity": 1 }, { "name": "5 stk", "barcode": "5740600979751", "quantity": 5 }, { "name": "Kasse", "quantity": 30, "barcode": "5740600979355" }], "picture": "img/tuborg_nul_33_cl_flaske.png" },
        { "name": "Tuborg RÅ (økologisk) 33 cl flaske", "inventory_size": [{ "name": "Styk", "barcode": "57075167", "quantity": 1 }, { "name": "5 stk", "barcode": "5740600986124", "quantity": 5 }, { "name": "Kasse", "quantity": 30, "barcode": "5740600986353" }, "picture": "img/tuborg_raa_(oekologisk)_33_cl_flaske.png" },
        { "name": "Tuborg Squash 150 cl", "inventory_size": [{ "name": "Styk", "barcode": "57045740", "quantity": 1 }, { "name": "Kasse", "quantity": 8, "barcode": "5740600984380" }], "picture": "img/tuborg_squash_150_cl.png" },
        { "name": "Tuborg Squash 50 cl", "inventory_size": [{ "name": "Styk", "barcode": "57045511", "quantity": 1 }, { "name": "4 stk", "barcode": "5740600984755", "quantity": 4 }, { "name": "Kasse", "quantity": 24, "barcode": "5740600984281" }], "picture": "img/tuborg_squash_50_cl.pn" },
    ];
}

function fetchProducts() {
    //TODO: fetch from localstorage
    return sampleProducts()
}


$(function() {

    var products = fetchProducts()
    for (var i = 0; i < products.length; i++) {
        addProductRow(products[i]);
    }

    $('#product-id').on('change', handleBarcodeInput)
    $('#add-product-row').click(newEmptyProductRow)
    $('#test-btn').click(() => { generateBarcodes() })
    $('#undo-scan').click(undo_scan)

});