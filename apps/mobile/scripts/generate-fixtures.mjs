import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as alphaTab from '@coderline/alphatab'

const { Score, MasterBar, Track, Staff, Bar, Voice, Beat, Note, Tuning, Duration } =
  alphaTab.model

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const mobileRoot = path.resolve(scriptDir, '..')
const fixturesDir = path.join(mobileRoot, 'fixtures', 'scores')
const settings = new alphaTab.Settings()

const fixtures = [
  {
    fileName: 'synthetic-open-strings.gp',
    title: 'Synthetic Open Strings',
    subTitle: 'Single-track smoke test',
    tracks: [
      {
        name: 'Clean Guitar',
        program: 25,
        channel: 0,
        bars: [
          [[6, 0], [5, 0], [4, 0], [3, 0]],
          [[2, 0], [1, 0], [2, 1], [3, 2]],
          [[4, 2], [3, 0], [2, 1], [1, 0]],
          [[6, 3], [5, 2], [4, 0], [3, 0]]
        ]
      }
    ]
  },
  {
    fileName: 'synthetic-chord-study.gp',
    title: 'Synthetic Chord Study',
    subTitle: 'Chord rendering smoke test',
    tracks: [
      {
        name: 'Rhythm Guitar',
        program: 27,
        channel: 0,
        bars: [
          [
            [[6, 0], [5, 2], [4, 2]],
            [[3, 1], [2, 0], [1, 0]],
            [[5, 3], [4, 2], [2, 1]],
            [[6, 3], [5, 2], [1, 3]]
          ],
          [
            [[4, 0], [3, 2], [2, 3]],
            [[5, 2], [4, 4], [3, 4]],
            [[6, 1], [5, 3], [4, 3]],
            [[6, 0], [5, 2], [4, 2]]
          ],
          [
            [[5, 0], [4, 2], [3, 2]],
            [[4, 0], [3, 2], [2, 3]],
            [[6, 3], [5, 2], [1, 3]],
            [[6, 0], [5, 2], [4, 2]]
          ],
          [
            [[6, 0], [5, 2], [4, 2]],
            [[5, 0], [4, 2], [3, 2]],
            [[4, 0], [3, 2], [2, 3]],
            [[6, 0], [5, 2], [4, 2]]
          ]
        ]
      }
    ]
  },
  {
    fileName: 'synthetic-two-tracks.gp',
    title: 'Synthetic Two Tracks',
    subTitle: 'Track panel smoke test',
    tracks: [
      {
        name: 'Lead Guitar',
        program: 30,
        channel: 0,
        bars: [
          [[1, 5], [2, 5], [3, 4], [4, 7]],
          [[1, 7], [2, 8], [3, 7], [4, 9]],
          [[1, 8], [2, 10], [3, 9], [4, 10]],
          [[1, 12], [2, 10], [3, 9], [4, 7]]
        ]
      },
      {
        name: 'Bass',
        program: 33,
        channel: 2,
        strings: 4,
        bars: [
          [[4, 0], [4, 0], [3, 2], [3, 2]],
          [[4, 3], [4, 3], [3, 5], [3, 5]],
          [[4, 5], [4, 5], [3, 7], [3, 7]],
          [[4, 0], [3, 2], [2, 2], [1, 0]]
        ]
      }
    ]
  }
]

function addTempo(masterBar, bpm) {
  const automation = alphaTab.model.Automation.buildTempoAutomation(false, 0, bpm, 2)
  masterBar.tempoAutomations.push(automation)
}

function normalizeBeat(input) {
  const notes = Array.isArray(input?.[0]) ? input : [input]
  return notes.map(([string, fret]) => ({ string, fret }))
}

function buildScore(fixture) {
  Score.resetIds()

  const score = new Score()
  score.title = fixture.title
  score.subTitle = fixture.subTitle
  score.artist = 'GTR Synthetic Fixtures'
  score.music = 'Generated original test material'
  score.tab = 'apps/mobile/scripts/generate-fixtures.mjs'
  score.copyright = 'Synthetic fixture; no third-party composition.'

  const barCount = Math.max(...fixture.tracks.map((track) => track.bars.length))
  for (let i = 0; i < barCount; i++) {
    const masterBar = new MasterBar()
    if (i === 0) addTempo(masterBar, 96)
    score.addMasterBar(masterBar)
  }

  for (const trackFixture of fixture.tracks) {
    const track = new Track()
    track.name = trackFixture.name
    track.playbackInfo.program = trackFixture.program
    track.playbackInfo.primaryChannel = trackFixture.channel
    track.playbackInfo.secondaryChannel = trackFixture.channel + 1

    const staff = new Staff()
    staff.stringTuning = Tuning.getDefaultTuningFor(trackFixture.strings ?? 6)
    track.addStaff(staff)
    score.addTrack(track)

    for (let barIndex = 0; barIndex < barCount; barIndex++) {
      const bar = new Bar()
      const voice = new Voice()
      const beats = trackFixture.bars[barIndex] ?? []

      for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
        const beat = new Beat()
        beat.duration = Duration.Quarter
        for (const noteFixture of normalizeBeat(beats[beatIndex] ?? [1, 0])) {
          const note = new Note()
          note.string = noteFixture.string
          note.fret = noteFixture.fret
          beat.addNote(note)
        }
        voice.addBeat(beat)
      }

      bar.addVoice(voice)
      staff.addBar(bar)
    }
  }

  score.finish(settings)
  return score
}

async function writeFixture(fixture) {
  const score = buildScore(fixture)
  const exporter = new alphaTab.exporter.Gp7Exporter()
  const data = exporter.export(score, settings)
  const roundTrip = alphaTab.importer.ScoreLoader.loadScoreFromBytes(data, settings)

  if (roundTrip.title !== fixture.title || roundTrip.tracks.length !== fixture.tracks.length) {
    throw new Error(`Generated fixture failed round-trip validation: ${fixture.fileName}`)
  }

  await writeFile(path.join(fixturesDir, fixture.fileName), data)
  console.log(`wrote ${fixture.fileName}`)
}

await mkdir(fixturesDir, { recursive: true })
for (const fixture of fixtures) {
  await writeFixture(fixture)
}
