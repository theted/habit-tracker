import { START_LOCATION, type Router } from 'vue-router'

// The visit counter the sundbergsolutions.se sites share: daily totals per site, with no cookies
// and no stored IP addresses. It only counts a request whose Referer is the live site, so the dev
// server never adds to it.
const PIXEL = 'https://visits.sundbergsolutions.se/v.gif?s=habit-tracker'

// One view per page the router lands on, including the first. The CSP forbids the usual inline
// snippet, hence a router hook. document.referrer doesn't change on client-side navigation, so it
// goes with the first view only; sending it every time would count a referral per page.
export const countVisits = (router: Router) => {
  router.afterEach((to, from, failure) => {
    const first = from === START_LOCATION
    if (failure || (!first && to.path === from.path)) return
    new Image().src = first ? `${PIXEL}&r=${encodeURIComponent(document.referrer)}` : PIXEL
  })
}
