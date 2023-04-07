<script lang="ts" setup>
import { ref } from 'vue'
import { NButton, NInput, NSelect, NSlider, useMessage } from 'naive-ui'
import { useSettingStore } from '@/store'
import type { SettingsState } from '@/store/modules/settings/helper'
import { t } from '@/locales'

const settingStore = useSettingStore()

const ms = useMessage()

const listModel = [
  'gpt-3.5-turbo', 'gpt-3.5-turbo-0301',
]
const disableModels = ['gpt-4', 'gpt-4-0314', 'gpt-4-32k', 'gpt-4-32k-0314']
const optionModel = listModel.map(str => ({ label: str, value: str })).concat(
  disableModels.map(str => ({ label: str, value: str, disabled: true })))

const systemMessage = ref(settingStore.systemMessage ?? '')
const systemModel = ref(settingStore.systemModel ?? '')

const temperature = ref(settingStore.temperature ?? 0.5)

const top_p = ref(settingStore.top_p ?? 1)

function updateSettings(options: Partial<SettingsState>) {
  settingStore.updateSetting(options)
  ms.success(t('common.success'))
}

function handleReset() {
  settingStore.resetSetting()
  ms.success(t('common.success'))
  window.location.reload()
}
</script>

<template>
  <div class="p-4 space-y-5 min-h-[200px]">
    <div class="space-y-6">
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[120px]">{{ $t('setting.role') }}</span>
        <div class="flex-1">
          <NInput v-model:value="systemMessage" type="textarea" :autosize="{ minRows: 1, maxRows: 4 }" />
        </div>
        <NButton size="tiny" text type="primary" @click="updateSettings({ systemMessage })">
          {{ $t('common.save') }}
        </NButton>
      </div>
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[120px]">{{ $t('setting.temperature') }} </span>
        <div class="flex-1">
          <NSlider v-model:value="temperature" :max="1" :min="0" :step="0.1" />
        </div>
        <span>{{ temperature }}</span>
        <NButton size="tiny" text type="primary" @click="updateSettings({ temperature })">
          {{ $t('common.save') }}
        </NButton>
      </div>
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[120px]">{{ $t('setting.top_p') }} </span>
        <div class="flex-1">
          <NSlider v-model:value="top_p" :max="1" :min="0" :step="0.1" />
        </div>
        <span>{{ top_p }}</span>
        <NButton size="tiny" text type="primary" @click="updateSettings({ top_p })">
          {{ $t('common.save') }}
        </NButton>
      </div>
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[120px]">{{ $t('setting.model') }}</span>
        <div class="flex-2">
          <NSelect v-model:value="systemModel" :options="optionModel" placeholder="gpt-3.5-turbo-0301" />
        </div>
        <NButton size="tiny" text type="primary" @click="updateSettings({ systemModel })">
          {{ $t('common.save') }}
        </NButton>
      </div>
    </div>
    <div class="flex items-center space-x-4">
      <span class="flex-shrink-0 w-[120px]">&nbsp;</span>
      <NButton size="small" @click="handleReset">
        {{ $t('common.reset') }}
      </NButton>
    </div>
  </div>
</template>
