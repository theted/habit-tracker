import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { countVisits } from './visits'

const Page = { template: '<div />' }

let sent: string[]

beforeEach(() => {
  sent = []
  vi.stubGlobal(
    'Image',
    class {
      set src(url: string) {
        sent.push(url)
      }
    }
  )
})

const setUp = async (referrer = '') => {
  vi.spyOn(document, 'referrer', 'get').mockReturnValue(referrer)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Page },
      { path: '/habits/:id', component: Page },
      { path: '/private', component: Page, beforeEnter: () => false }
    ]
  })
  countVisits(router)
  await router.push('/')
  return router
}

describe('countVisits', () => {
  it('counts the first page, with the referrer', async () => {
    await setUp('https://news.example/item?id=1')

    expect(sent).toEqual([
      'https://visits.sundbergsolutions.se/v.gif?s=habit-tracker&r=https%3A%2F%2Fnews.example%2Fitem%3Fid%3D1'
    ])
  })

  it('counts each later page without it', async () => {
    const router = await setUp('https://news.example/')
    await router.push('/habits/1')
    await router.push('/habits/2')

    expect(sent.slice(1)).toEqual([
      'https://visits.sundbergsolutions.se/v.gif?s=habit-tracker',
      'https://visits.sundbergsolutions.se/v.gif?s=habit-tracker'
    ])
  })

  it('skips a change of query or hash, and a navigation that was refused', async () => {
    const router = await setUp()
    await router.push('/?next=%2Fhabits%2F1')
    await router.push('/#top')
    await router.push('/private')

    expect(sent).toHaveLength(1)
  })
})
