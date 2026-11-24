import subprocess, sys, os
HIER=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(HIER,'out')
from multiprocessing import Pool
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import zeitplan
FPS=30
cuts=[0,6,10,18.6,26.6,34.6,40.6,46.6,52.4,58.6,66,72]
chunks=[(i,cuts[i],cuts[i+1]) for i in range(len(cuts)-1)]
if len(sys.argv)>1: chunks=[c for c in chunks if str(c[0]) in sys.argv[1:]]
def work(ch):
    i,a,b=ch; f0,f1=round(zeitplan.echt(a)*FPS),round(zeitplan.echt(b)*FPS)
    os.makedirs(OUT,exist_ok=True); out=os.path.join(OUT,f'p{i:02d}.mp4'); tmp=out.replace('.mp4','.tmp.mp4')
    ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','image2pipe','-framerate',str(FPS),'-c:v','mjpeg','-i','-',
        '-c:v','libx264','-preset','veryfast','-crf','17','-pix_fmt','yuv420p','-r',str(FPS),tmp],stdin=subprocess.PIPE)
    with sync_playwright() as p:
        br=p.chromium.launch(); pg=br.new_page(viewport={'width':1920,'height':1080})
        pg.goto('file://'+os.path.join(HIER,'stage.html')); pg.wait_for_timeout(400)
        for f in range(f0,f1):
            pg.evaluate(f'seek({zeitplan.buehne(f/FPS):.5f})')
            ff.stdin.write(pg.screenshot(type='jpeg',quality=92))
        br.close()
    ff.stdin.close(); rc=ff.wait()
    if rc==0: os.replace(tmp,out)
    return i,rc
if __name__=='__main__':
    with Pool(2) as pool:
        for r in pool.imap_unordered(work,chunks): print(r,flush=True)
