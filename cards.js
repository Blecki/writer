let cards = [];
let display = null;
let card_display = null;
let left_filters = { display: null, filters: [] };
let right_filters = { display: null, filters: [] };
let all_properties = [];
let all_tags = [];
let all_operations = ["equal to", "greater-than", "less-than"];
let stats_display = null;
let order_by_display = null;
let order_by_selector = null;
let order_by = "date";

import { Fluent } from "./fluent.js";
const f = Fluent();

import { SaveSystem } from "./save.js";
const save_system = SaveSystem();

export function save_cards() {
    save_system.save(cards);
}

export function load_cards() {
    var file_chooser_modal;
    display_modal(file_chooser_modal = make_file_chooser((file) => save_system.load(file, c => { cards = c; refresh(); destroy_modal(file_chooser_modal); })), () => {});
}

function clear(element) {
    element.innerHTML = "";
}

function add_between(list, item) {
    var r = [];
    for (var x = 0; x < list.length; ++x) {
        if (x != 0) r.push(item);
        r.push(list[x]);
    }
    return r;
}

function make_card_contents(card) {
    return f.div(
        f.div(...add_between(card.tags.map(t => f.div(t).class("tag-button"))), " "),
        f.raw_div(card.summary)
    );
}

function make_word_percentage_display(word_count, word_goal) {
    var percentage = Math.floor((word_count / word_goal) * 100);
    if (word_count > word_goal) percentage = 100;

    return f.div(
        f.div("" + word_count + " of " + word_goal)._style({fontSize: "0.6em", fontWeight: "bold", marginTop: "2px"}),
        f.div(
            f.div()._style({width: "" + percentage + "%", minHeight: "8px", marginTop: "0px", marginLeft: "0px"}).class("marker")
        )
    )._style({ gridTemplateRows: "15px 15px", paddingTop: "0px"});
}

function make_card_display(card, sequence, type) {
    var summary_div, prose_div;
    var r = f.div(
        f.div(card.name)._style({fontWeight: "bold"}).grid(1,2,2,3),
        f.div(sequence).grid(1, 3, 2, 4),
        make_word_percentage_display(card.word_count, card.word_goal).grid(1, 4, 2, 5).class("box"),
        f.button("Edit", () => edit_card(card)).grid(1,5,2,6)._style({justifySelf: "start", alignSelf: "start"}),
        summary_div = make_card_contents(card).grid(2,2,3,7)._style({display: card.summary_expanded ? "block" : "none"}),
        prose_div = f.raw_div(card.prose).grid(3,2,4,7)._style({display: card.prose_expanded ? "block" : "none"}),
        make_expando_button(summary_div, card.summary_expanded, (state) => card.summary_expanded = state).grid(1,6,2,7),
        make_expando_button(prose_div, card.prose_expanded, (state) => card.summary_expanded = state).grid(1,7,2,8)
    )._style({
        gridTemplateColumns: "15px Auto 150px 130px 80px 30px 30px 15px",
        gridTemplateRows: "30px auto"
    });

    if (type == "left" || type == "both")
        r.appendChild(f.div().class("marker").grid(1,1,3,2));
    if (type == "right" || type == "both")
        r.appendChild(f.div().class("marker").grid(1,8,3,9));

    return r;
}

function make_expando_button(controlled_element, expanded, state_callback) {
    var open, closed;

    closed = f.button("<", () => { 
        closed.style.display = "none";
        open.style.display = "block";
        controlled_element.style.display = "block";
        if (state_callback) state_callback(true);
    })._style({display: expanded ? "none" : "block"}).class("arrow-toggle");
    
    open = f.button("V", () => { 
        closed.style.display = "block";
        open.style.display = "none";
        controlled_element.style.display = "none";
        if (state_callback) state_callback(false);
    })._style({display: expanded ? "block" : "none"}).class("arrow-toggle");
    
    return f.div(closed, open)._style({justifySelf: "start", alignSelf: "start"});
}

function refresh_order_by_display() {
    var order_by_value = order_by_selector == null ? "date" : order_by_selector.value;
    clear(order_by_display);
    order_by_display.appendChild(f.div("Order By: ", 
        order_by_selector = f.select(all_properties, order_by_value).handler("change", () => refresh())));
}

function refresh_filter_display(filter_set, side) {
    filter_set.filters = filter_set.filters.filter(f => f.valid());

    clear(filter_set.display);
    filter_set.display.appendChild(
        f.div(
            f.div(side, " Filters",
                f.button("+ Property Filter", () => add_propfilter(filter_set)),
                f.button("+ Tag Filter", () => add_tagfilter(filter_set)),
            ),
            f.div(
                ...filter_set.filters.map(f => make_filter_display(filter_set, f))
            )
        ).class("box")
    );
}

function get_filtered_cards(card_set, filter_set) {
    return card_set.filter(c => {
        for (var filter of filter_set.filters)
            if (!filter.passes(c)) return false;
        return true;
    });
}

function get_minimum_date(left_cards, left_index, right_cards, right_index) {
    if (left_index >= left_cards.length && right_index >= right_cards.length)
        return 0;
    if (left_index >= left_cards.length)
        return right_cards[right_index].date;
    if (right_index >= right_cards.length)
        return left_cards[left_index].date;
    if (left_cards[left_index].date < right_cards[right_index].date)
        return left_cards[left_index].date;
    return right_cards[right_index].date;
}

function refresh() {
    quick_save();
    all_properties = ["name", "date"];
    for (var card of cards) {
        for (var property_name in card.dynamic_properties) {
            if (!card.dynamic_properties.hasOwnProperty(property_name)) continue;
            if (all_properties.indexOf(property_name) === -1)
            all_properties.push(property_name);
        }
    }

    all_tags = [];
    for (var card of cards)
        for (var tag in card.tags)
            if (all_tags.indexOf(card.tags[tag]) === -1)
                all_tags.push(card.tags[tag]);

    refresh_order_by_display();
    refresh_filter_display(left_filters, "Left");
    refresh_filter_display(right_filters, "Right");
    order_by = order_by_selector.value;
    cards.sort((a, b) => a[order_by].localeCompare(b[order_by]));

    clear(card_display);
    var left_cards = get_filtered_cards(cards, left_filters);
    var right_cards = get_filtered_cards(cards, right_filters);

    var current_date = get_minimum_date(left_cards, 0, right_cards, 0);
    var left_index = 0;
    var right_index = 0;

    while (true) {
        var row_type = "none";
        if (left_index >= left_cards.length && right_index >= right_cards.length) break;
        else if (left_index >= left_cards.length) {
            current_date = right_cards[right_index].date;
            row_type = "right";
        }
        else if (right_index >= right_cards.length) {
            current_date = left_cards[left_index].date;
            row_type = "left";
        }
        else {
            current_date = get_minimum_date(left_cards, left_index, right_cards, right_index);
            if (left_cards[left_index].date != current_date)
                row_type = "right";
            else if (right_cards[right_index].date != current_date)
                row_type = "left";
            else 
                row_type = "both";
        }

        if (row_type == "none") {} // ??
        else if (row_type == "left") {
            card_display.appendChild(make_card_display(left_cards[left_index],current_date,row_type).class("timeline"));
            left_index += 1;
        }
        else if (row_type == "right") {
            card_display.appendChild(make_card_display(right_cards[right_index], current_date,row_type).class("timeline"));
            right_index += 1;
        }
        else if (row_type == "both") {
            card_display.appendChild(make_card_display(left_cards[left_index], current_date, row_type).class("timeline"));
            left_index += 1;
            right_index += 1;
        }
    }

    update_stats();
}

function make_filter_display(filter_set, filter) {
    return f.div(filter.display(), f.button("x", () => {
        filter_set.filters = filter_set.filters.filter(x => x !== filter);
        refresh();
    }).modify(e => e.style.float = "right")).class("filter-display-container");
}


function make_blank_card() {
    return {
        id: self.crypto.randomUUID(),
        name: "new card",
        date: 0.0,
        dynamic_properties: {},
        tags: [],
        summary: "",
        prose: "",
        word_count: 0,
        word_goal: 0
    };
}

function make_empty_propfilter() {
    return {
        id: self.crypto.randomUUID(),
        property_name: "",
        property_value: "",
        operation: "equal",
        display: function() {
            return f.raw_div("<i>where</i> " + this.property_name + " <i>is " + this.operation + "</i> " + this.property_value);
        },
        valid: function() {
            if (all_properties.indexOf(this.property_name) === -1)
                return false;
            return true;
        },
        passes: function(card) {
            var value = "";
            if (card.hasOwnProperty(this.property_name)) value = card[this.property_name];
            else if (card.dynamic_properties.hasOwnProperty(this.property_name)) value = card.dynamic_properties[this.property_name];
            else return false;

            if (this.operation == "equal-to")
                return value == this.property_value;
            if (this.operation == "greater-than")
                return value > this.property_value;
            if (this.operation == "less-than")
                return value < this.property_value;
            return false;
        }
    };
}

function make_empty_tagfilter() {
    return {
        id: self.crypto.randomUUID(),
        tag_name: "",
        display: function() {
            return f.raw_div("<i>which is tagged</i> " + this.tag_name);
        },
        valid: function() {
            return true;
        },
        passes: function(card) {
            return card.tags.includes(this.tag_name);
        }
    };
}

function prepare_dynamic_property_editors(card, editor) {
    for (var property_key in card.dynamic_properties) {
        if (!card.dynamic_properties.hasOwnProperty(property_key)) continue;
        var property_editor = make_dynamic_property_editor(card, property_key);
        editor.dynamic_property_editors.push(property_editor);
    }
}

function make_card_editor(card) {
    var editor = {
        current_card: card,
        dynamic_property_editors: [],
        active_tag_editor: null
    };

    prepare_dynamic_property_editors(card, editor);

    editor.element = f.div(
        f.div("CARD ID: " + card.id).class("margin-box"),
        f.div("Name: ", editor.name_editor = f.input(card.name)).class("margin-box"),
        f.div("Date: ", editor.date_editor = f.input(card.date)).class("margin-box"),
        f.div("Word Goal: ", editor.word_goal_editor = f.input(card.word_goal).modify(e => e.type = 'number')).class("margin-box"),
        ...editor.dynamic_property_editors,
        editor.new_property_row = f.div(
            f.button("+ Property", 
                () => { 
                    var property_creator = make_dynamic_property_editor(editor.current_card, "new");
                    editor.element.insertBefore(property_creator.element, editor.new_property_row);
                    editor.dynamic_property_editors.push(property_creator);
                }).modify(e => e.style.float = "right")
            ).modify(d => d.style.overflow = "hidden"),
        f.div(editor.tag_list = f.div()).class("margin-box box"),
        f.div("Summary: ", editor.summary_editor_div = make_text_editor(card.summary, () => {})),
        f.div("Prose: ", editor.prose_editor_div = make_text_editor(card.prose, (stats) => { card.word_count = stats.word_count; update_stats(); })),
        f.div(
            f.button("Save",
            () => {
                save_values_to_card(editor);
                destroy_modal(editor);
            }).modify(e => e.style.float = "right"),
            f.button("Delete",
            () => {
                cards = cards.filter(c => c !== card);
                destroy_modal(editor);
            }).modify(e => e.style.float = "left")
        ).modify(d => d.style.overflow = "hidden")
    ).class("padded-box")._style({overflow: "auto"});

    editor.summary_editor_div = editor.summary_editor_div.firstChild;
    editor.prose_editor_div = editor.prose_editor_div.firstChild;

    populate_tag_list(editor);
    return editor;
}

function make_text_editor(contents, stats_func) {
    var blur_func = function(event, editable) {
        var stats = { word_count: count_words(contents_div.textContent) };
        stats_div.innerText = "Words: " + stats.word_count;
        if (stats_func) stats_func(stats);
    };

    var contents_div;
    var stats_div;
    var r = f.div(
        contents_div = f.raw_div(contents)._style({padding: "4px", overflow: "auto", maxHeight: "500px"}).class("editable margin-box"),
        stats_div = f.div("STATS")
    )._style({gridTemplateRows: "auto 40px"});
    r._medium_editor = new MediumEditor(contents_div);
    r._medium_editor.subscribe('blur', blur_func);

    blur_func();
    return r;
}

function count_words(s){
    s = s.replace(/(^\s*)|(\s*$)/gi,"");    // exclude  start and end white-space
    s = s.replace(/[ ]{2,}/gi," ");         // 2 or more space to 1
    s = s.replace(/\n /,"\n");              // exclude newline with a start spacing
    return s.split(' ').filter(function(str){return str!="";}).length;
}

function update_stats() {
    var total_prose_words = 0;
    var total_prose_goal = 0;
    for (var card of cards) {
        if (card.hasOwnProperty("word_count")) 
            total_prose_words += card.word_count;
        if (card.hasOwnProperty("word_goal") && card.word_goal != "")
            total_prose_goal += parseInt(card.word_goal);
    }
    clear(stats_display);
    stats_display.appendChild(f.div(
        f.div("Cards: " + cards.length),
        f.div("Words: " + total_prose_words),
        f.div("Goal: " + total_prose_goal)
    ));
}

function populate_tag_list(editor) {
    clear(editor.tag_list);
    editor.tag_list.appendChild(f.div(
        f.button("+ Tag", () => { 
            if (editor.active_tag_editor != null) return;
            var new_tag_editor = f.input("");
            var editor_row =  f.div(new_tag_editor);
            new_tag_editor.onchange = () => {
                editor.current_card.tags.push(new_tag_editor.value);
                populate_tag_list(editor);
                editor.active_tag_editor = null;
            };
            editor.tag_list.appendChild(editor_row);
            new_tag_editor.focus();
            editor.active_tag_editor = new_tag_editor;
        }),
        ...editor.current_card.tags.map(t => f.div(
            t,
            f.button("X", () => {
                editor.current_card.tags = editor.current_card.tags.filter(t2 => t2 != t);
                populate_tag_list(editor);
            }).class("hidden-button")
        ).class('tag-button'))));
}

function make_propfilter_editor(filter) {
    var editor = {
        current_filter: filter,
    };
    
    editor.element = f.div(
        f.div(
            editor.property_name_field = f.select(all_properties, filter.property_name),
            editor.operation_field = f.select(all_operations, filter.operation),
            editor.property_value_field = f.input(filter.property_value)
        ),
        f.div(
            f.button("Save", () => {
                editor.current_filter.property_name = editor.property_name_field.value;
                editor.current_filter.operation = editor.operation_field.value;
                editor.current_filter.property_value = editor.property_value_field.value;
                destroy_modal(editor)
            }).modify(e => e.style.float = "left")
        ).modify(e => e.style.overflow = "hidden")
    ).class("box");

    return editor;
}

function make_tagfilter_editor(filter) {
    var editor = {
        current_filter: filter,
    };
    
    editor.element = f.div(
        f.div(
            editor.tag_name_field = f.select(all_tags, filter.tag_name)
        ),
        f.div(
            f.button("Save", () => {
                editor.current_filter.tag_name = editor.tag_name_field.value;
                destroy_modal(editor)
            }).modify(e => e.style.float = "left")
        ).modify(e => e.style.overflow = "hidden")
    ).class("box");

    return editor;
}

function make_file_chooser(onchosen) {
    var file;
    var modal;
    modal = {
        element: f.div(
            f.div(file = f.file()),
            f.div(
                f.button("cancel", () => destroy_modal(modal)),
                f.button("load", () => onchosen(file.files[0]))
            )
        )
    };
    return modal;
}

function make_dynamic_property_editor(card, property_key) {
    var r = {
        property_name_field: f.input(property_key),
        property_value_field: f.input(card.dynamic_properties.hasOwnProperty(property_key) ? card.dynamic_properties[property_key] : "")
    };

    r.element = f.div(r.property_name_field, r.property_value_field);
    return r;
}

function save_values_to_card(editor) {
    console.log(editor.current_card);
    editor.current_card.name = editor.name_editor.value;
    editor.current_card.date = editor.date_editor.value;
    editor.current_card.summary = editor.summary_editor_div.innerHTML;
    editor.current_card.prose = editor.prose_editor_div.innerHTML;
    editor.current_card.word_goal = editor.word_goal_editor.value;
    
    editor.current_card.dynamic_properties = {};
    for (var property_editor of editor.dynamic_property_editors)
        editor.current_card.dynamic_properties[property_editor.property_name_field.value] = property_editor.property_value_field.value;    
}

function display_modal(modal, onclose) {
    var wrapper = document.createElement('div');
    wrapper.className = 'modal';
    var content = document.createElement('div');
    content.className = 'modal-content';
    wrapper.appendChild(content);
    content.appendChild(modal.element);
    display.appendChild(wrapper);
    wrapper.style.display = 'block';
    modal.__wrapped_modal_element = wrapper;
    modal.__onclose = onclose;
}

function destroy_modal(modal) {
    if (modal.__onclose != undefined) modal.__onclose();
    modal.__wrapped_modal_element.remove();    
}

export function edit_card(card) {
    var card_editor = make_card_editor(card);
    display_modal(card_editor, refresh);
    card_editor.name_editor.focus();
}

export function edit_propfilter(filter) {
    var filter_editor = make_propfilter_editor(filter);
    display_modal(filter_editor, refresh);
}

export function edit_tagfilter(filter) {
    var filter_editor = make_tagfilter_editor(filter);
    display_modal(filter_editor, refresh);
}

export function add_card() {
    var new_card = make_blank_card();
    cards.push(new_card);
    edit_card(new_card);   
}

export function add_propfilter(filter_set) {
    var new_filter = make_empty_propfilter();
    filter_set.filters.push(new_filter);
    edit_propfilter(new_filter);
}

export function add_tagfilter(filter_set) {
    var new_filter = make_empty_tagfilter();
    filter_set.filters.push(new_filter);
    edit_tagfilter(new_filter);
}

function quick_save() {
    save_system.save_local(cards);
}

export function initialize_cards(_display) {
    display = _display;
    display.appendChild(
        f.div(
            f.div(
                f.div(
                    f.div(
                        f.div(
                            f.button("+ Card", add_card),
                            f.button("Save", save_cards),
                            f.button("Load", load_cards),
                            f.button("Clear", () => { cards = []; refresh(); })
                        )._style({marginBottom: "4px"}),
                        order_by_display = f.div(

                        )
                    ),
                    left_filters.display = f.div().class("margin-box"),
                    right_filters.display = f.div().class("margin-box"),
                    stats_display = f.div("Stats").class("margin-box box")
                ).class("topbar"),
                card_display = f.div()
            ),
            f.div(
                f.h4("Todo"),
                f.ul(
                    f.li("And/Or filter combinations")
                )
            )
        )
    );

    var saved_local_data = save_system.load_local();
    console.log(saved_local_data);
    if (saved_local_data != undefined && saved_local_data.hasOwnProperty("CARDS") && saved_local_data.CARDS.length > 0) {
        console.log("Loaded Cards");
        cards = saved_local_data.CARDS;
    }

    refresh();
}

