
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    // const material = writable([])

    // const add = (item, price) => {
    //     material.update(items => {
    //         let itemObject = {
    //             item,
    //             price,
    //             id: new Date().getTime()
    //         }
    //         return [itemObject, ...items]
    //     })
    // }

    function materialF() {
        const { subscribe, set, update } = writable([]);

        return {
            subscribe,
            set,
            add: (item, price) => {
                update(items => {
                    let itemObject = {
                        item,
                        price,
                        id: new Date().getTime()
                    };

                    return [itemObject, ...items]
                });
            },

            updateMaterial: (item, price, id) => {
                update(items => {
                    items.forEach(i => {
                        if (i.id === id) {
                            i.item = item;
                            i.price = price;
                        }
                    });
                    return items
                });
            }



        }
    }




    let material = materialF();

    if (localStorage.getItem('material')) {
        material.set(JSON.parse(localStorage.getItem('material')));
    }
    material.subscribe(items => {
        localStorage.setItem('material', JSON.stringify(items));
    });

    /* src\Form.svelte generated by Svelte v3.23.0 */
    const file = "src\\Form.svelte";

    // (53:2) {#if mode === 'edit'}
    function create_if_block(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Cancel";
    			attr_dev(button, "class", "float-right svelte-ut8al6");
    			attr_dev(button, "type", "button");
    			add_location(button, file, 53, 4, 1020);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*cancel*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(53:2) {#if mode === 'edit'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let form;
    	let fieldset;
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let label1;
    	let t4;
    	let input1;
    	let t5;
    	let button;
    	let t6;
    	let button_disabled_value;
    	let t7;
    	let mounted;
    	let dispose;
    	let if_block = /*mode*/ ctx[2] === "edit" && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			form = element("form");
    			fieldset = element("fieldset");
    			label0 = element("label");
    			label0.textContent = "Material:";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			label1 = element("label");
    			label1.textContent = "Price:";
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			button = element("button");
    			t6 = text(/*mode*/ ctx[2]);
    			t7 = space();
    			if (if_block) if_block.c();
    			attr_dev(label0, "for", "item");
    			add_location(label0, file, 41, 4, 635);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Wood, Glu, Etc");
    			add_location(input0, file, 42, 4, 675);
    			attr_dev(label1, "for", "price");
    			add_location(label1, file, 43, 4, 748);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "step", "any");
    			attr_dev(input1, "placeholder", "price");
    			add_location(input1, file, 44, 4, 786);
    			add_location(fieldset, file, 40, 2, 620);
    			button.disabled = button_disabled_value = !/*cantAdd*/ ctx[3];
    			attr_dev(button, "class", "float-right svelte-ut8al6");
    			attr_dev(button, "type", "submit");
    			add_location(button, file, 51, 2, 914);
    			add_location(form, file, 39, 0, 577);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, fieldset);
    			append_dev(fieldset, label0);
    			append_dev(fieldset, t1);
    			append_dev(fieldset, input0);
    			set_input_value(input0, /*item*/ ctx[1]);
    			append_dev(fieldset, t2);
    			append_dev(fieldset, label1);
    			append_dev(fieldset, t4);
    			append_dev(fieldset, input1);
    			set_input_value(input1, /*price*/ ctx[0]);
    			append_dev(form, t5);
    			append_dev(form, button);
    			append_dev(button, t6);
    			append_dev(form, t7);
    			if (if_block) if_block.m(form, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[7]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[8]),
    					listen_dev(form, "submit", prevent_default(/*submit*/ ctx[4]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*item*/ 2 && input0.value !== /*item*/ ctx[1]) {
    				set_input_value(input0, /*item*/ ctx[1]);
    			}

    			if (dirty & /*price*/ 1 && to_number(input1.value) !== /*price*/ ctx[0]) {
    				set_input_value(input1, /*price*/ ctx[0]);
    			}

    			if (dirty & /*mode*/ 4) set_data_dev(t6, /*mode*/ ctx[2]);

    			if (dirty & /*cantAdd*/ 8 && button_disabled_value !== (button_disabled_value = !/*cantAdd*/ ctx[3])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}

    			if (/*mode*/ ctx[2] === "edit") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(form, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { id } = $$props;
    	let { price } = $$props;
    	let { item = "" } = $$props;

    	function submit() {
    		if (!cantAdd) {
    			return;
    		}

    		if (mode === "add") {
    			material.add(item, price, id);
    		}

    		if (mode === "edit") {
    			material.updateMaterial(item, price, id);
    		}

    		$$invalidate(1, item = "");
    		$$invalidate(0, price = "");
    	}

    	function cancel() {
    		$$invalidate(1, item = "");
    		$$invalidate(0, price = "");
    		$$invalidate(2, mode = "add");
    	}

    	const writable_props = ["id", "price", "item"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Form> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Form", $$slots, []);

    	function input0_input_handler() {
    		item = this.value;
    		$$invalidate(1, item);
    	}

    	function input1_input_handler() {
    		price = to_number(this.value);
    		$$invalidate(0, price);
    	}

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(6, id = $$props.id);
    		if ("price" in $$props) $$invalidate(0, price = $$props.price);
    		if ("item" in $$props) $$invalidate(1, item = $$props.item);
    	};

    	$$self.$capture_state = () => ({
    		material,
    		id,
    		price,
    		item,
    		submit,
    		cancel,
    		mode,
    		cantAdd
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(6, id = $$props.id);
    		if ("price" in $$props) $$invalidate(0, price = $$props.price);
    		if ("item" in $$props) $$invalidate(1, item = $$props.item);
    		if ("mode" in $$props) $$invalidate(2, mode = $$props.mode);
    		if ("cantAdd" in $$props) $$invalidate(3, cantAdd = $$props.cantAdd);
    	};

    	let mode;
    	let cantAdd;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*id*/ 64) {
    			 $$invalidate(2, mode = id ? "edit" : "add");
    		}

    		if ($$self.$$.dirty & /*item, price*/ 3) {
    			 $$invalidate(3, cantAdd = item !== "" && price > 0);
    		}
    	};

    	return [
    		price,
    		item,
    		mode,
    		cantAdd,
    		submit,
    		cancel,
    		id,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Form extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { id: 6, price: 0, item: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Form",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[6] === undefined && !("id" in props)) {
    			console.warn("<Form> was created without expected prop 'id'");
    		}

    		if (/*price*/ ctx[0] === undefined && !("price" in props)) {
    			console.warn("<Form> was created without expected prop 'price'");
    		}
    	}

    	get id() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get price() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set price(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get item() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const scaleX = animation.from.width / node.clientWidth;
        const scaleY = animation.from.height / node.clientHeight;
        const dx = (animation.from.left - animation.to.left) / scaleX;
        const dy = (animation.from.top - animation.to.top) / scaleY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /* src\Table.svelte generated by Svelte v3.23.0 */
    const file$1 = "src\\Table.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (40:4) {#each $material as mat (mat.id)}
    function create_each_block(key_1, ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*mat*/ ctx[5].item + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*formater*/ ctx[2].format(/*mat*/ ctx[5].price) + "";
    	let t2;
    	let t3;
    	let td2;
    	let i;
    	let t4;
    	let mounted;
    	let dispose;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			i = element("i");
    			t4 = space();
    			add_location(td0, file$1, 41, 8, 782);
    			add_location(td1, file$1, 49, 8, 964);
    			attr_dev(i, "class", "far fa-trash-alt hover svelte-1q4lo4i");
    			add_location(i, file$1, 51, 10, 1025);
    			add_location(td2, file$1, 50, 8, 1010);
    			add_location(tr, file$1, 40, 6, 769);
    			this.first = tr;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, i);
    			append_dev(tr, t4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						td0,
    						"click",
    						function () {
    							if (is_function(/*dispatch*/ ctx[3]("edit", {
    								id: /*mat*/ ctx[5].id,
    								item: /*mat*/ ctx[5].item,
    								price: /*mat*/ ctx[5].price
    							}))) /*dispatch*/ ctx[3]("edit", {
    								id: /*mat*/ ctx[5].id,
    								item: /*mat*/ ctx[5].item,
    								price: /*mat*/ ctx[5].price
    							}).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						i,
    						"click",
    						function () {
    							if (is_function(/*deleteMaterial*/ ctx[4](/*mat*/ ctx[5].id))) /*deleteMaterial*/ ctx[4](/*mat*/ ctx[5].id).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*$material*/ 2 && t0_value !== (t0_value = /*mat*/ ctx[5].item + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*$material*/ 2 && t2_value !== (t2_value = /*formater*/ ctx[2].format(/*mat*/ ctx[5].price) + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(40:4) {#each $material as mat (mat.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;
    	let t5;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t6;
    	let tfoot;
    	let tr1;
    	let td0;
    	let t8;
    	let td1;
    	let t9_value = /*formater*/ ctx[2].format(/*total*/ ctx[0]) + "";
    	let t9;
    	let each_value = /*$material*/ ctx[1];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*mat*/ ctx[5].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Item";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "Price";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "Delete";
    			t5 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			tfoot = element("tfoot");
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "Total";
    			t8 = space();
    			td1 = element("td");
    			t9 = text(t9_value);
    			add_location(th0, file$1, 33, 6, 637);
    			add_location(th1, file$1, 34, 6, 657);
    			add_location(th2, file$1, 35, 6, 678);
    			add_location(tr0, file$1, 32, 4, 626);
    			add_location(thead, file$1, 31, 2, 614);
    			add_location(tbody, file$1, 38, 2, 717);
    			add_location(td0, file$1, 58, 6, 1170);
    			attr_dev(td1, "colspan", "2");
    			add_location(td1, file$1, 59, 6, 1191);
    			add_location(tr1, file$1, 57, 4, 1159);
    			add_location(tfoot, file$1, 56, 2, 1147);
    			attr_dev(table, "class", "primary svelte-1q4lo4i");
    			add_location(table, file$1, 30, 0, 588);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t1);
    			append_dev(tr0, th1);
    			append_dev(tr0, t3);
    			append_dev(tr0, th2);
    			append_dev(table, t5);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			append_dev(table, t6);
    			append_dev(table, tfoot);
    			append_dev(tfoot, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, t8);
    			append_dev(tr1, td1);
    			append_dev(td1, t9);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*deleteMaterial, $material, formater, dispatch*/ 30) {
    				const each_value = /*$material*/ ctx[1];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, destroy_block, create_each_block, null, get_each_context);
    			}

    			if (dirty & /*total*/ 1 && t9_value !== (t9_value = /*formater*/ ctx[2].format(/*total*/ ctx[0]) + "")) set_data_dev(t9, t9_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $material;
    	validate_store(material, "material");
    	component_subscribe($$self, material, $$value => $$invalidate(1, $material = $$value));
    	const formater = new Intl.NumberFormat("en-us", { style: "currency", currency: "USD" });
    	const dispatch = createEventDispatcher();

    	function deleteMaterial(id) {
    		material.set($material.filter(mat => mat.id !== id));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Table> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Table", $$slots, []);

    	$$self.$capture_state = () => ({
    		material,
    		flip,
    		createEventDispatcher,
    		formater,
    		dispatch,
    		deleteMaterial,
    		total,
    		$material
    	});

    	$$self.$inject_state = $$props => {
    		if ("total" in $$props) $$invalidate(0, total = $$props.total);
    	};

    	let total;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$material*/ 2) {
    			 $$invalidate(0, total = $material.reduce(
    				(prev, cur, index) => {
    					prev = prev + cur.price;
    					return prev;
    				},
    				0
    			));
    		}
    	};

    	return [total, $material, formater, dispatch, deleteMaterial];
    }

    class Table extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Table",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.23.0 */
    const file$2 = "src\\App.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let t2;
    	let current;

    	const form = new Form({
    			props: {
    				item: /*item*/ ctx[0],
    				price: /*price*/ ctx[1],
    				id: /*id*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const table = new Table({ $$inline: true });
    	table.$on("edit", /*edit*/ ctx[3]);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Project Estimator";
    			t1 = space();
    			create_component(form.$$.fragment);
    			t2 = space();
    			create_component(table.$$.fragment);
    			add_location(h1, file$2, 26, 2, 413);
    			attr_dev(main, "class", "svelte-1m1a7u3");
    			add_location(main, file$2, 25, 0, 404);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			mount_component(form, main, null);
    			append_dev(main, t2);
    			mount_component(table, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const form_changes = {};
    			if (dirty & /*item*/ 1) form_changes.item = /*item*/ ctx[0];
    			if (dirty & /*price*/ 2) form_changes.price = /*price*/ ctx[1];
    			if (dirty & /*id*/ 4) form_changes.id = /*id*/ ctx[2];
    			form.$set(form_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(form.$$.fragment, local);
    			transition_in(table.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(form.$$.fragment, local);
    			transition_out(table.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(form);
    			destroy_component(table);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let item;
    	let price;
    	let id;

    	function edit(event) {
    		// item = event.detail.item;
    		// price = event.detail.price;
    		// id = event.detail.id;
    		$$invalidate(0, { item, price, id } = event.detail, item, $$invalidate(1, price), $$invalidate(2, id));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ Form, Table, item, price, id, edit });

    	$$self.$inject_state = $$props => {
    		if ("item" in $$props) $$invalidate(0, item = $$props.item);
    		if ("price" in $$props) $$invalidate(1, price = $$props.price);
    		if ("id" in $$props) $$invalidate(2, id = $$props.id);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [item, price, id, edit];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
