var fixed_data = [];
var index_data = [];
var checkedStrikeValues = [];
var exp_date_nw = [];
var const_filterd_data = [];
var date_filtered = [];
var underlying_value = '';


//******************************************************************************************************************************** */
// function to update the checkboxes
//******************************************************************************************************************************** */

function read_checkbox() {
    // Get references to the checkboxes
    var all_spCheckbox = document.getElementById('all_sp');
    var near_atmCheckbox = document.getElementById('near_atm');
    var otherCheckboxes_sp = document.querySelectorAll('input[type="checkbox"]:not(#all_sp)');
    var otherCheckboxes_natm = document.querySelectorAll('input[type="checkbox"]:not(#near_atm)');



    // Add a change event listener to the "all_sp" checkbox
    all_spCheckbox.addEventListener('change', function () {
        // If "all_sp" checkbox is checked, make other checkboxes read-only
        var readOnlyValue_sp = all_spCheckbox.checked;
        otherCheckboxes_sp.forEach(function (checkbox) {
            checkbox.disabled = readOnlyValue_sp;
            if (readOnlyValue_sp) { checkbox.checked = false; }
        });
    });

    // Add a change event listener to the "near_atm" checkbox
    near_atmCheckbox.addEventListener('change', function () {
        // If "near_atm" checkbox is checked, make other checkboxes read-only
        var readOnlyValue_natm = near_atmCheckbox.checked;
        otherCheckboxes_natm.forEach(function (checkbox) {
            checkbox.disabled = readOnlyValue_natm;
            if (readOnlyValue_natm) { checkbox.checked = false; }
        });
    });
}




//******************************************************************************************************************************** */
// function to get the underlyning value 
//******************************************************************************************************************************** */

function underlying_val(data) {
    spot_price = data[0].CE.underlyingValue;
    underlying_value = spot_price;
    // return underlying_value;

}





//******************************************************************************************************************************** */
// function to get the response data and update 
//******************************************************************************************************************************** */

function pass_data(data) {
    const_filterd_data = data;
}

//******************************************************************************************************************************** */
// function to update the timestamp on the dashbord and show time
//******************************************************************************************************************************** */

function set_time() {
    var today = new Date();
    // var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = time;
    document.getElementById("last_update").innerHTML = dateTime;
    // console.log(dateTime)
}



//******************************************************************************************************************************** */
// function to get all the filtered data 
//******************************************************************************************************************************** */


function get_select() {
    fixed_data.length = 0;
    get_datewise_date();
    getCheckedStrikeValues();
    fixed_data.push(index_data, checkedStrikeValues, exp_date_nw);
    // console.log('index_data',fixed_data);
    get_all_filter(const_filterd_data);
    get_underlying_value(filteredData)

}



//******************************************************************************************************************************** */
// function to update the date with filter 
//******************************************************************************************************************************** */


function get_all_filter(data) {

    filteredData = data.filter(item => item.expiryDate === fixed_data[2][0] && item.CE.underlying === fixed_data[0][0]);


    date_filtered = filteredData;
    underlying_val(date_filtered)
    set_time();
    filter_seleccted_strike_price(fixed_data);
    get_underlying_value(filteredData);
}


//******************************************************************************************************************************** */
// function to get the data for the selected strike price 
//******************************************************************************************************************************** */

function filter_seleccted_strike_price(fixed_data) {

    // console.log(filteredData)
    var strike_p = fixed_data[1];
    var final_sorted = [];

    if (strike_p.includes('near_atm')) {

        var dataa = filteredData;

        for (i = 0; i < dataa.length; i++) {
            var sp = filteredData[i].strikePrice;
            if (spot_price < sp) {
                spot_res = i;
                break;
            }
            else {

            }
        }
        var back = spot_res - 8;
        var next = spot_res + 8;

        var near_atm = []
        for (i = back; i <= next; i++) {
            final_sorted.push(filteredData[i])

        }

    }
    else if (strike_p.includes('all_sp')) {

        final_sorted = filteredData
    }
    else {
        for (let index = 0; index < strike_p.length; index++) {
            const element = strike_p[index];
            final_sorted.push(final_strike_select(element));
        }
    }




    if (final_sorted.length != 0) {
        renderdata(final_sorted);
        //(final_sorted);
        get_underlying_value(date_filtered);
    }
    else {
        renderdata(date_filtered);
        get_underlying_value(date_filtered);
    }
}


function final_strike_select(data) {
    // console.log(data)
    const filteredData_ = date_filtered.filter((item) => {
        return item.strikePrice == data;
    });

    return filteredData_[0];

}


//******************************************************************************************************************************** */
// function to update the underlying value on the top of the table 
//******************************************************************************************************************************** */

function get_underlying_value(data) {

    // console.log('get_underlying_value')
    document.getElementById('underlying_value').innerHTML = data[0].PE.underlyingValue;
    setTimeout(() => {
        document.getElementById('underlying_value').innerHTML = data[0].PE.underlyingValue;
    }, 100);
    // 
}



//******************************************************************************************************************************** */
// function get_datewise_date to update the date 
//******************************************************************************************************************************** */
function get_datewise_date() {
    exp_date_nw.length = 0;
    var eee = document.getElementById('dropdown-date').value;
    exp_date_nw.push(eee);


}

//******************************************************************************************************************************** */
// function show_data to check is used to update the data 
//******************************************************************************************************************************** */
function show_data(data_selector, data) {

    filteredData = data.filter((item) => {
        return item.CE.underlying === data_selector;
    });

    // console.log(filteredData);

    // console.log(data_selector,filteredData);
    function_expDate(filteredData, exp_date);
    check_box_update(filteredData);
    get_datewise_date();

}



//******************************************************************************************************************************** */
// function getCheckedStrikeValues  is used to get and store selected/checked strike price values 
//******************************************************************************************************************************** */
function getCheckedStrikeValues() {
    checkedStrikeValues.length = 0;
    var checkboxes = document.querySelectorAll('.dropdown input[type="checkbox"]');

    for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
            checkedStrikeValues.push(checkboxes[i].value);
        }
    }
}

//******************************************************************************************************************************** */
// Update the strikeprice values 
//******************************************************************************************************************************** */

function check_box_update(data) {
    // console.log(data);
    var strike_p = [];
    strike_p.length = 0;
    for (var i = 0; i < data.length; i++) {
        var exp = data[i].strikePrice;
        strike_p.push(exp);
        // console.log('strike_p',exp);

    }
    strike_p = [...new Set(strike_p)];
    create_checkbox(strike_p);
}


//******************************************************************************************************************************** */
// Create checkbox for strike price 
//******************************************************************************************************************************** */
function create_checkbox(options) {

    // Get the dropdown element
    var dropdown = document.getElementById("dropdown");
    dropdown.innerHTML = "";



    // Loop through the options and create checkboxes
    options.forEach(function (option) {
        // Create checkbox element
        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = option;
        checkbox.classList.add('strike_price');
        // Create label element for the checkbox
        var label = document.createElement("label");
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(option));

        // Create list item element for the dropdown option
        var listItem = document.createElement("div");
        listItem.appendChild(label);
        // Append the list item to the dropdown
        dropdown.appendChild(listItem);
    });

    var bulk_buttons =
        `<div class="dropdown_top_btn">
             <label><input id="all_sp" type="checkbox" value="all_sp">All Strikes</label>
             <label><input id="near_atm" type="checkbox" checked value="near_atm">Near ATM</label>                             
         </div>`;

    dropdown.insertAdjacentHTML("afterbegin", bulk_buttons);



    dropdown.innerHTML += `<div class="button_checkbox d-flex"><span onclick="get_select()"  class="btn btn-secondary">Update</span><span type="button" onclick="uncheck()" class="btn btn-secondary" id="cancel_strike">Clear</span></div>`;
}


//******************************************************************************************************************************** */
// function index_check_available to check is index available if avaialbe then add the tab at the top 
//******************************************************************************************************************************** */
function index_check_available(data) {
    const_global_data = data;
    var index_holder = [];
    index_data = [];
    const data_selector = [];
    for (let i = 0; i < data.length; i++) {
        var ceUnderlying = data[i].CE.underlying;
        index_holder.push(ceUnderlying);
        // var new_index_holder = Array.from(new Set(index_holder));
    }
    var nav_tab = document.getElementById('nav-tabs-top');
    const values = ['NIFTY', 'BANKNIFTY'];
    const multipleExist = values.every(value => {
        return index_holder.includes(value);
    });
    const nifty_classes = ['nav-link', 'active', 'top-link'];
    const bank_n_classe = ['nav-link', 'top-link'];
    if (multipleExist) {
        data_selector.length = 0;
        create_list_item(nav_tab, 'NIFTY', "#", "nifty", nifty_classes);
        create_list_item(nav_tab, 'BANKNIFTY', "#", "bank", bank_n_classe);
        data_selector.push('NIFTY');
    }
    else {
        data_selector.length = 0;
        if (index_holder.includes('NIFTY')) {

            create_list_item(nav_tab, 'NIFTY', "#", "nifty", nifty_classes);
            data_selector.push('NIFTY');
        }
        if (index_holder.includes('BANKNIFTY')) {
            create_list_item(nav_tab, 'BANKNIFTY', "#", "bank", bank_n_classe);
            data_selector.push('BANKNIFTY');
        }
    }
    setTimeout(function () {
        show_data(data_selector[0], data);
        index_data.push(data_selector[0]);
        get_select(data);
    }, 10);
    var buttons = document.getElementsByClassName("top-link");
    // // Get all elements with the class name "top-link"
    // Add click event listeners to each button
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener("click", handleClick);
    }
    // Click event handler function
    function handleClick(event) {

        index_data.length = 0;
        // console.log('top');
        data_selector.length = 0;
        // Get the clicked button
        var button = event.target;
        // Get the value of the "data-value" attribute
        var dataValue = button.getAttribute("data");
        // Log the attribute value

        if (dataValue == 'nifty') {
            data_selector.push('NIFTY');
        }
        else {
            data_selector.push('BANKNIFTY');
        }

        setTimeout(function () {
            show_data(data_selector[0], data);
            index_data.push(data_selector[0]);
            get_select(data);

        }, 10);
    }
}



//******************************************************************************************************************************** */
// create tab 
//******************************************************************************************************************************** */

function create_list_item(nav_tab, text, link, pass_d, clasees) {
    var listItem = document.createElement("li");
    var anchorTag = document.createElement("a");
    anchorTag.textContent = text;
    anchorTag.setAttribute("href", link);
    anchorTag.setAttribute("data", pass_d);

    // Add classes
    listItem.classList.add("nav-item");
    clasees.forEach(function (className) {
        anchorTag.classList.add(className);
    });
    listItem.appendChild(anchorTag);
    nav_tab.appendChild(listItem);
    update_tabs()
}


//******************************************************************************************************************************** */
// Update the data attribute and active class for tabs 
//******************************************************************************************************************************** */

function update_tabs() {
    // Get the tab elements
    var tabs = document.getElementsByClassName("top-link");
    // Add click event listeners to tabs
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener("click", handleTabClick);
    }
    // Click event handler function
    function handleTabClick(event) {
        // Remove active class from other tabs
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove("active");
        }
        // Add active class to the clicked tab
        this.classList.add("active");
    }
}


//******************************************************************************************************************************** */
//to create exp date array
//******************************************************************************************************************************** */
function function_expDate(data, selector) {
    var exp_date = [];
    exp_date.length = 0;
    for (var i = 0; i < data.length; i++) {
        var exp = data[i].expiryDate;
        exp_date.push(exp);
        exp_date = [...new Set(exp_date)];
    }
    updateDropdown(exp_date, selector);
}


//******************************************************************************************************************************** */
//Function to create and update the dropdown options 
//******************************************************************************************************************************** */
function updateDropdown(optionvalue, selector) {
    // Clear existing options
    selector.innerHTML = "";
    // Add new options based on data
    for (let i = 0; i < optionvalue.length; i++) {
        const option = document.createElement('option');
        option.value = optionvalue[i];
        option.textContent = optionvalue[i];
        selector.appendChild(option);
    }
}


//******************************************************************************************************************************** */
// On cancle button click uncheck strike price 
//******************************************************************************************************************************** */
function uncheck() {
    var checkboxes = document.querySelectorAll('div#dropdown input[type="checkbox"]');
    checkboxes.forEach(function (checkbox) {
        checkbox.checked = false;
        checkbox.disabled = false;
    });

    renderdata(filteredData);
    get_underlying_value(filteredData)


}

//******************************************************************************************************************************** */
// function to add pricce line //
//******************************************************************************************************************************** */


function add_price_line(data) {

    var dataa = data;
    var spot_res;
    for (i = 0; i < dataa.length; i++) {
        var sp = data[i].strikePrice;
        if (spot_price < sp) {
            spot_res = i;
            break;
        }
        else {

        }
    }
    for (i = 0; i < spot_res; i++) {
        data[i].CE.class = '_dark';
        data[i].PE.class = '_light';
    }
    for (i = spot_res; i < data.length; i++) {
        data[i].PE.class = '_dark';
        data[i].CE.class = '_light';
    }
    if (spot_res) {
        data[spot_res].spot_price = 'spot_price';

    }

    console.log(dataa);
    var tot_vol_ce = [];
    var tot_vol_pe = [];


    var tot_oi_ce = [];
    var tot_oi_pe = [];

    for (var i = 0; i < dataa.length; i++) {

        tot_vol_ce.push(parseInt(dataa[i].CE.totalTradedVolume.replace(/\,/g, '')));
        tot_vol_pe.push(parseInt(dataa[i].PE.totalTradedVolume.replace(/\,/g, '')));

        tot_oi_ce.push(parseInt(dataa[i].CE.openInterest.replace(/\,/g, '')));
        tot_oi_pe.push(parseInt(dataa[i].PE.openInterest.replace(/\,/g, '')));
    }

    console.log('CE', tot_oi_ce, 'pe', tot_oi_pe)

    get_max_volume(tot_vol_pe, ['PE', 'volu'], dataa)
    get_max_volume(tot_vol_ce, ['CE', 'volu'], dataa)

    get_max_volume(tot_oi_pe, ['PE', 'oi'], dataa)
    get_max_volume(tot_oi_ce, ['CE', 'oi'], dataa)


}




function get_max_volume(array, call, data) {
    var percent = 0
    var calloptions_ = call[0]
    var clss = call[1]

    var maxVolu_ = largest(array)
    var maxVolume_index = array.indexOf(maxVolu_)

    var sec_maxVolu = sec_large(array)
    var sec_maxVolu_index = array.indexOf(sec_maxVolu)

    percent = (sec_maxVolu / maxVolu_) * 100
    percent = percent.toFixed(2)



    var towords = [];
    towords.length = 0;
    if (calloptions_ == 'PE') {
        if (clss == 'volu') {
            data[maxVolume_index].PE.maxvolume = 'maximum_volume';
            if (percent > 75) {
                data[sec_maxVolu_index].PE.maxvolume = 'highlight';
                data[sec_maxVolu_index].PE.valu_percent = percent;
                if (sec_maxVolu_index < maxVolume_index) {
                    // towords.push('up');
                    data[maxVolume_index].PE.volume_direction = 'up';

                }
                else {
                    // towords.push('down');
                    data[maxVolume_index].PE.volume_direction = 'down';

                }
            }
            else {
                // towords.push('strong');
                data[maxVolume_index].PE.volume_direction = 'strong';

            }

        }
        else if (clss == 'oi') {
            data[maxVolume_index].PE.maxoi = 'maximum_oi';

            if (percent > 75) {
                data[sec_maxVolu_index].PE.maxoi = 'highlight';
                data[sec_maxVolu_index].PE.oi_percent = percent;
                if (sec_maxVolu_index < maxVolume_index) {
                    // towords.push('up');
                    data[maxVolume_index].PE.oi_direction = 'up';

                }
                else {
                    // towords.push('down');
                    data[maxVolume_index].PE.oi_direction = 'down';

                }
            }
            else {
                // towords.push('strong');
                data[maxVolume_index].PE.oi_direction = 'strong';

            }
        }
        else {

        }
    }
    else if (calloptions_ == 'CE') {

        if (clss == 'volu') {
            data[maxVolume_index].CE.maxvolume = 'maximum_volume';
            if (percent > 75) {
                data[sec_maxVolu_index].CE.maxvolume = 'highlight';
                data[sec_maxVolu_index].CE.valu_percent = percent;
                if (sec_maxVolu_index < maxVolume_index) {
                    // towords.push('up');
                    data[maxVolume_index].CE.volume_direction = 'up';

                }
                else {
                    // towords.push('down');
                    data[maxVolume_index].CE.volume_direction = 'down';

                }
            }
            else {
                // towords.push('strong');
                data[maxVolume_index].CE.volume_direction = 'strong';

            }
        }
        else if (clss == 'oi') {
            data[maxVolume_index].CE.maxoi = 'maximum_oi';
            if (percent > 75) {
                data[sec_maxVolu_index].CE.maxoi = 'highlight';
                data[sec_maxVolu_index].CE.oi_percent = percent;

                if (sec_maxVolu_index < maxVolume_index) {
                    // towords.push('up');
                    data[maxVolume_index].CE.oi_direction = 'up';

                }
                else {
                    // towords.push('down');
                    data[maxVolume_index].CE.oi_direction = 'down';

                }
            }
            else {
                // towords.push('strong');
                data[maxVolume_index].CE.oi_direction = 'strong';

            }

        }
        else {

        }

    }
    // console.log(towords)

}




function largest(arr) {
    let i;

    // Initialize maximum element
    let max = arr[0];

    // Traverse array elements 
    // from second and compare
    // every element with current max 
    for (i = 1; i < arr.length; i++) {
        if (arr[i] > max)
            max = arr[i];
    }
    return max;
}

function sec_large(arr) {
    let largest = -Infinity, secondLargest = -Infinity;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] > largest) {
            secondLargest = largest;
            largest = arr[i];
        }
        else if (arr[i] < largest && arr[i] > secondLargest) {
            secondLargest = arr[i];
        }
    }
    if (secondLargest !== -Infinity) {
        var finaal = secondLargest;
    }
    else {

    }
    return finaal;
}
