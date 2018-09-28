import Vue from 'vue'

import QIcon from '../icon/QIcon.js'
import QResizeObservable from '../observables/QResizeObservable.js'

function getIndicatorClass (val) {
  return val ? `text-${val}` : null
}

export default Vue.extend({
  name: 'QTabsBar',

  provide () {
    return {
      tabs: this.tabs,
      activateTab: this.activateTab,
      __activateRoute: this.__activateRoute
    }
  },

  props: {
    value: String,

    align: {
      type: String,
      default: 'center',
      validator: v => ['left', 'center', 'right', 'justify'].includes(v)
    },
    breakpoint: {
      type: Number,
      default: 450
    },

    activeColor: String,
    indicatorColor: String,
    leftIcon: String,
    rightIcon: String,

    narrowIndicator: Boolean,
    inlineLabel: Boolean,
    noCaps: Boolean
  },

  data () {
    return {
      tabs: {
        current: this.value,
        activeColor: this.activeColor,
        indicatorClass: getIndicatorClass(this.indicatorColor),
        narrowIndicator: this.narrowIndicator,
        inlineLabel: this.inlineLabel,
        noCaps: this.noCaps
      },
      scrollable: false,
      leftArrow: true,
      rightArrow: false,
      justify: false,

      // 2 * mobile .q-tabs-bar__offset min-width
      extraOffset: this.$q.platform.is.mobile ? 104 : 0
    }
  },

  watch: {
    value (name) {
      this.activateTab(name)
    },

    activeColor (v) {
      this.tabs.activeColor = v
    },

    indicatorColor (v) {
      this.tabs.indicatorClass = getIndicatorClass(v)
    },

    narrowIndicator (v) {
      this.tabs.narrowIndicator = v
    },

    inlineLabel (v) {
      this.tabs.inlineLabel = v
    },

    noCaps (v) {
      this.tabs.noCaps = v
    }
  },

  computed: {
    alignClass () {
      const align = this.scrollable
        ? 'left'
        : (this.justify ? 'justify' : this.align)

      return `q-tabs-bar__content--align-${align}`
    }
  },

  methods: {
    activateTab (name) {
      if (this.tabs.current !== name) {
        this.__animate(this.tabs.current, name)
        this.tabs.current = name
        this.$emit('input', name)
      }
    },

    __activateRoute (params) {
      const
        { name, selectable, exact, selected, priority } = params,
        first = !this.buffer.length,
        existingIndex = first ? -1 : this.buffer.findIndex(t => t.name === name)

      if (existingIndex > -1) {
        const buffer = this.buffer[existingIndex]
        exact && (buffer.exact = exact)
        selectable && (buffer.selectable = selectable)
        selected && (buffer.selected = selected)
        priority && (buffer.priority = priority)
      }
      else {
        this.buffer.push(params)
      }

      if (first) {
        this.bufferTimer = setTimeout(() => {
          let tab = this.buffer.find(t => t.exact && t.selected) ||
            this.buffer.find(t => t.selectable && t.selected) ||
            this.buffer.find(t => t.exact) ||
            this.buffer.filter(t => t.selectable).sort((t1, t2) => t2.priority - t1.priority)[0] ||
            this.buffer[0]

          this.buffer.length = 0
          this.activateTab(tab.name)
        }, 100)
      }
    },

    updateContainer ({ width }) {
      const scroll = this.$refs.content.scrollWidth - (this.scrollable ? this.extraOffset : 0) > width
      if (this.scrollable !== scroll) {
        this.scrollable = scroll
      }

      scroll && this.$nextTick(() => this.__updateArrows())

      const justify = width < this.breakpoint
      if (this.justify !== justify) {
        this.justify = justify
      }
    },

    __animate (oldName, newName) {
      const
        oldTab = oldName
          ? this.$children.find(tab => tab.name === oldName)
          : null,
        newTab = newName
          ? this.$children.find(tab => tab.name === newName)
          : null

      if (oldTab && newTab) {
        const
          oldEl = oldTab.$el.getElementsByClassName('q-tab__indicator')[0],
          newEl = newTab.$el.getElementsByClassName('q-tab__indicator')[0]

        clearTimeout(this.animateTimer)

        oldEl.style.transition = 'none'
        oldEl.style.transform = null
        newEl.style.transition = 'none'
        newEl.style.transform = null

        const
          oldPos = oldEl.getBoundingClientRect(),
          newPos = newEl.getBoundingClientRect()

        newEl.style.transform = `translateX(${oldPos.left - newPos.left}px) scaleX(${oldPos.width / newPos.width})`

        // allow scope updates to kick in
        this.$nextTick(() => {
          this.animateTimer = setTimeout(() => {
            newEl.style.transition = 'transform .25s cubic-bezier(.4, 0, .2, 1)'
            newEl.style.transform = null
          }, 30)
        })
      }

      if (newTab && this.scrollable) {
        const
          { left, width } = this.$refs.content.getBoundingClientRect(),
          newPos = newTab.$el.getBoundingClientRect()

        let offset = newPos.left - left

        if (offset < 0) {
          this.$refs.content.scrollLeft += offset
          this.__updateArrows()
          return
        }

        offset += newPos.width - width
        if (offset > 0) {
          this.$refs.content.scrollLeft += offset
          this.__updateArrows()
        }
      }
    },

    __updateArrows () {
      const
        content = this.$refs.content,
        left = content.scrollLeft

      this.leftArrow = left > 0
      this.rightArrow = left + content.getBoundingClientRect().width + 5 < content.scrollWidth
    },

    __animScrollTo (value) {
      this.__stopAnimScroll()
      this.__scrollTowards(value)

      this.scrollTimer = setInterval(() => {
        if (this.__scrollTowards(value)) {
          this.__stopAnimScroll()
        }
      }, 5)
    },

    __scrollToStart () {
      this.__animScrollTo(0)
    },

    __scrollToEnd () {
      this.__animScrollTo(9999)
    },

    __stopAnimScroll () {
      clearInterval(this.scrollTimer)
    },

    __scrollTowards (value) {
      let
        content = this.$refs.content,
        left = content.scrollLeft,
        direction = value < left ? -1 : 1,
        done = false

      left += direction * 5
      if (left < 0) {
        done = true
        left = 0
      }
      else if (
        (direction === -1 && left <= value) ||
        (direction === 1 && left >= value)
      ) {
        done = true
        left = value
      }

      content.scrollLeft = left
      this.__updateArrows()
      return done
    }
  },

  created () {
    this.buffer = []
  },

  beforeDestroy () {
    clearTimeout(this.bufferTimer)
    clearTimeout(this.animateTimer)
  },

  render (h) {
    return h('div', {
      staticClass: 'q-tabs-bar row no-wrap items-center',
      'class': `q-tabs-bar--${this.scrollable ? '' : 'not-'}scrollable`,
      attrs: { role: 'tablist' }
    }, [
      h(QResizeObservable, {
        on: { resize: this.updateContainer }
      }),

      h(QIcon, {
        staticClass: 'q-tabs-bar__arrow q-tabs-bar__arrow--left q-tab__icon',
        'class': this.leftArrow ? '' : 'invisible',
        props: { name: this.leftIcon || this.$q.icon.tabs.left },
        nativeOn: {
          mousedown: this.__scrollToStart,
          touchstart: this.__scrollToStart,
          mouseup: this.__stopAnimScroll,
          mouseleave: this.__stopAnimScroll,
          touchend: this.__stopAnimScroll
        }
      }),

      h('div', {
        ref: 'content',
        staticClass: 'q-tabs-bar__content row no-wrap items-center',
        'class': this.alignClass
      }, [
        h('div', { staticClass: 'q-tabs-bar__offset invisible' }, ['-'])
      ].concat(this.$slots.default).concat([
        h('div', { staticClass: 'q-tabs-bar__offset invisible' }, ['-'])
      ])),

      h(QIcon, {
        staticClass: 'q-tabs-bar__arrow q-tabs-bar__arrow--right q-tab__icon',
        'class': this.rightArrow ? '' : 'invisible',
        props: { name: this.rightIcon || this.$q.icon.tabs.right },
        nativeOn: {
          mousedown: this.__scrollToEnd,
          touchstart: this.__scrollToEnd,
          mouseup: this.__stopAnimScroll,
          mouseleave: this.__stopAnimScroll,
          touchend: this.__stopAnimScroll
        }
      })
    ])
  }
})
