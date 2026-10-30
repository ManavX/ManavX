import { Composition, Folder } from 'remotion'
import { YearOrbit } from './data/YearOrbit'
import { Worlds } from './projects/Worlds'
import { Portal } from './footer/Portal'
import { Flyby } from './footer/Flyby'
import { Cabin } from './cabin/Cabin'
import { Flight } from './heroes/Flight'
import { Ignition } from './heroes/Ignition'
import { Orbit } from './heroes/Orbit'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Heroes">
        <Composition id="HeroIgnition" component={Ignition} durationInFrames={300} fps={30} width={1280} height={540} />
        <Composition id="HeroOrbit" component={Orbit} durationInFrames={300} fps={30} width={1280} height={540} />
        <Composition id="HeroFlight" component={Flight} durationInFrames={300} fps={30} width={1280} height={540} />
      </Folder>
      <Folder name="Data">
        <Composition id="Worlds" component={Worlds} durationInFrames={300} fps={30} width={1280} height={520} />
        <Composition id="YearOrbit" component={YearOrbit} durationInFrames={300} fps={30} width={1280} height={640} />
      </Folder>
      <Folder name="Cabin">
        <Composition id="Cabin" component={Cabin} durationInFrames={180} fps={15} width={1280} height={720} defaultProps={{ tracks: [], music: null }} />
      </Folder>
      <Folder name="Footer">
        <Composition id="Flyby" component={Flyby} durationInFrames={240} fps={30} width={1280} height={360} />
        <Composition id="Portal" component={Portal} durationInFrames={240} fps={30} width={1280} height={360} />
      </Folder>
    </>
  )
}
