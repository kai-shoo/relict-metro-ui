import { createApp, h, ref } from 'vue';
import { MetroPivot } from 'windows-phone-metro-ui/pivot';
import 'windows-phone-metro-ui/pivot-item';
import 'windows-phone-metro-ui/command-bar';
import 'windows-phone-metro-ui/tile';

if (customElements.get('metro-pivot') !== MetroPivot) throw new Error('Wrong Pivot registration');
createApp({
  setup() {
    const value = ref<MetroPivot['value']>('one');
    const choices = ref<string[]>([]);

    function handleChange(event: CustomEvent<{ value: string }>) {
      value.value = event.detail.value;
      choices.value.push(event.detail.value);
    }

    return () => [
      h('h1', 'Vue 3'),
      h('button', { type: 'button', onClick: () => { value.value = 'two'; } }, 'Select two programmatically'),
      h('output', { id: 'events' }, `${choices.value.length}:${choices.value.join(',')}`),
      h('metro-pivot', { label: 'Folders', value: value.value, 'on:metro-change': handleChange }, [
        h('metro-pivot-item', { label: 'One', value: 'one' }, 'First folder'),
        h('metro-pivot-item', { label: 'Two', value: 'two' }, 'Second folder'),
      ]),
    ];
  },
}).mount('#app');
