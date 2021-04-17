import dayjs from "https://esm.sh/dayjs@v1.10.4"
import customParseFormat from "https://esm.sh/dayjs@v1.10.4/plugin/customParseFormat.js"
import utc from "https://esm.sh/dayjs@v1.10.4/plugin/utc.js"
import timezone from "https://esm.sh/dayjs@v1.10.4/plugin/timezone.js"
import ics from "https://esm.sh/ics?no-check"

import { promisify } from "https://deno.land/std@0.93.0/node/util.ts"
import cheerio from "https://deno.land/x/cheerio@1.0.2/mod.ts"

dayjs.extend(customParseFormat)
dayjs.extend(utc)
dayjs.extend(timezone)

const res = await fetch("https://www.illc.uva.nl/NewsandEvents/Events/Conferences/")
const $ = cheerio.load(await res.text())
const events = $("#pagecontents > div > section > section:nth-child(9) .vevent").map((_, li) => {
    const title = $("h4", li).text()
    const uid = "taniguchi.masaya" + $(".uid", li).attr("href")
    const _start = dayjs($(".dtstart", li).attr("title"), "YYYY-MM-DD")
    const _end = dayjs($(".dtend", li).attr("title"), "YYYY-MM-DD")
    const location = $(".location", li).text().replace(/Location:\s*/, '')
    const deadline_src = 
        $("div", li)
            .filter((_, div)=>$(div).text().search(/Deadline:/) >= 0)
            .first()
            .text()
            .replace(/Deadline:\s*[a-zA-Z]+\s*/, '')
    const _deadline = dayjs(deadline_src, "D MMMM YYYY").utcOffset(-12*60)
    const start = _deadline.format("YYYY-M-D-H-m").split("-")
    const description = $(".description", li).text()
    return {
        _start: _start.isValid() ? _start.format("D MMMM YYYY") : "",
        _end: _end.isValid() ? _end.format("D MMMM YYYY") : "",
        _deadline: _deadline.isValid() ? _deadline.format("D MMMM YYYY") : "",
        start,
        duration: { hours: 24 },
        uid,
        title,
        description,
        location,
    }
}).toArray()
events.forEach(event => {
    delete event._start
    delete event._end
    delete event._deadline
})
const deadlines = await promisify(ics.createEvents)(events)