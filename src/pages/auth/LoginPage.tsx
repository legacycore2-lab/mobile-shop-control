import { useState } from 'react'
import { Eye, EyeOff, LogIn, ShoppingBag, BarChart3, Package, Users, Shield } from 'lucide-react'
import { signIn, enterDemoMode } from '@/lib/auth'
import { isConfigured } from '@/lib/supabase'

const FEATURES = [
  { icon: ShoppingBag, text: 'إدارة المبيعات والمشتريات' },
  { icon: Package,     text: 'متابعة المخزون والأجهزة'   },
  { icon: BarChart3,   text: 'تقارير وأرباح دقيقة'       },
  { icon: Users,       text: 'صلاحيات متعددة للمستخدمين' },
]

export function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes glow    { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes floatY  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        .ms-inp {
          width:100%; height:48px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:10px;
          color:white; font-size:14px;
          font-family:inherit; outline:none;
          transition:border-color .2s, box-shadow .2s;
        }
        .ms-inp::placeholder { color:rgba(255,255,255,0.3); }
        .ms-inp:focus {
          border-color:rgba(139,92,246,0.7);
          box-shadow:0 0 0 3px rgba(139,92,246,0.15);
          background:rgba(139,92,246,0.08);
        }
        .ms-btn-social {
          flex:1; height:44px; border-radius:10px;
          border:1px solid rgba(255,255,255,0.1);
          background:rgba(255,255,255,0.04);
          color:rgba(255,255,255,0.75);
          font-size:13px; font-weight:600;
          font-family:inherit; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:all .2s;
        }
        .ms-btn-social:hover {
          background:rgba(255,255,255,0.08);
          border-color:rgba(255,255,255,0.2);
        }
      `}</style>

      <div dir="rtl" style={{
        minHeight:'100vh', display:'flex', flexDirection:'column',
        background:'#0a0a14', fontFamily:"'Segoe UI',system-ui,sans-serif",
      }}>

        {/* ══ BRAND PANEL ══ */}
        <div style={{
          position:'relative', overflow:'hidden',
          display:'flex', flexDirection:'column',
          padding:'clamp(28px,4vw,52px) clamp(20px,4vw,48px)',
          minHeight:'clamp(280px,40vw,100vh)',
          background:'linear-gradient(140deg,#0d0d1f 0%,#12103a 50%,#0a0a14 100%)',
          flex:'0 0 auto',
        }}
          className="lg:w-[52%] lg:min-h-screen"
        >
          {/* Glow orbs */}
          <div style={{ position:'absolute', top:'30%', left:'40%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.35) 0%,transparent 65%)', filter:'blur(40px)', animation:'glow 4s ease-in-out infinite', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:'10%', right:'5%', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,0.2) 0%,transparent 70%)', filter:'blur(30px)', pointerEvents:'none' }}/>
          {/* Grid */}
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:.03, backgroundImage:'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize:'40px 40px' }}/>

          {/* Phone shapes — large screens only */}
          <div className="hidden lg:block">
            <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', animation:'floatY 5s ease-in-out infinite', zIndex:1 }}>
              <div style={{ width:160, height:300, borderRadius:28, background:'linear-gradient(160deg,#1e1040,#2d1b69,#1a0f3c)', border:'2px solid rgba(139,92,246,0.5)', boxShadow:'0 0 60px rgba(124,58,237,0.4)', display:'flex', flexDirection:'column' }}>
                <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 8px', gap:4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.1)' }}/>)}
                </div>
                <div style={{ flex:1, margin:'0 8px 8px', borderRadius:16, background:'linear-gradient(160deg,rgba(124,58,237,0.2),rgba(59,130,246,0.1))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#9333ea)', margin:'0 auto 8px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <ShoppingBag size={18} color="white"/>
                    </div>
                    <div style={{ width:60, height:3, borderRadius:2, background:'rgba(255,255,255,0.15)', margin:'0 auto 5px' }}/>
                    <div style={{ width:42, height:2, borderRadius:2, background:'rgba(255,255,255,0.08)', margin:'0 auto' }}/>
                  </div>
                </div>
                <div style={{ width:40, height:3, borderRadius:2, background:'rgba(255,255,255,0.15)', margin:'8px auto' }}/>
              </div>
              <div style={{ position:'absolute', right:-70, bottom:20, width:120, height:220, borderRadius:22, background:'linear-gradient(160deg,#0f0a2e,#1a1050)', border:'1.5px solid rgba(99,102,241,0.35)', boxShadow:'0 0 30px rgba(99,102,241,0.25)' }}>
                <div style={{ margin:'10px 7px 0', height:160, borderRadius:14, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.15)' }}/>
                <div style={{ width:30, height:2, borderRadius:2, background:'rgba(255,255,255,0.1)', margin:'8px auto' }}/>
              </div>
            </div>
          </div>

          {/* Logo */}
          <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,#7c3aed,#9333ea)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 24px rgba(124,58,237,0.5)', flexShrink:0 }}>
              <ShoppingBag size={22} color="white"/>
            </div>
            <div>
              <p style={{ color:'white', fontWeight:800, fontSize:20, lineHeight:1, letterSpacing:'-0.02em' }}>
                MOBILE <span style={{ color:'#a78bfa' }}>STORE</span>
              </p>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginTop:3 }}>إدارة متجرك في مكان واحد</p>
            </div>
          </div>

          {/* Headline + Features — visible on md+ */}
          <div style={{ position:'relative', zIndex:10, marginTop:'auto', paddingTop:24 }}>
            <h1 className="hidden sm:block" style={{ color:'white', fontWeight:800, fontSize:'clamp(22px,3.5vw,40px)', lineHeight:1.35, marginBottom:20, textShadow:'0 2px 20px rgba(124,58,237,0.3)' }}>
              سيطر على كل جهاز<br/>
              <span style={{ background:'linear-gradient(90deg,#a78bfa,#60a5fa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                من الشراء للبيع
              </span>
            </h1>
            <div className="hidden sm:flex" style={{ flexDirection:'column', gap:14 }}>
              {FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:32, height:32, borderRadius:9, flexShrink:0, background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={15} color="#a78bfa"/>
                  </div>
                  <p style={{ color:'rgba(255,255,255,0.7)', fontSize:14 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>

          <p style={{ position:'relative', zIndex:10, color:'rgba(255,255,255,0.2)', fontSize:11, marginTop:28 }}>
            © {new Date().getFullYear()} Mobile Store — All rights reserved
          </p>
        </div>

        {/* ══ FORM PANEL ══ */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#0f0f1e', padding:'clamp(32px,5vw,48px) clamp(20px,5vw,48px)' }}>
          <div style={{ width:'100%', maxWidth:400 }}>

            <div style={{ textAlign:'center', marginBottom:28 }}>
              <h2 style={{ color:'white', fontWeight:800, fontSize:'clamp(22px,3vw,30px)', marginBottom:6 }}>مرحباً بك</h2>
              <p style={{ color:'rgba(255,255,255,0.45)', fontSize:14 }}>سجل دخولك للمتابعة</p>
            </div>

            {/* Demo banner */}
            {!isConfigured && (
              <div style={{ marginBottom:20, borderRadius:14, background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(139,92,246,0.1))', border:'1px solid rgba(124,58,237,0.25)', padding:16 }}>
                <p style={{ color:'#c4b5fd', fontSize:13, fontWeight:600, marginBottom:8 }}>⚡ وضع العرض التجريبي</p>
                <p style={{ color:'rgba(196,181,253,0.7)', fontSize:12, marginBottom:12, lineHeight:1.6 }}>جرّب كل مميزات النظام بدون بيانات حقيقية</p>
                <button onClick={enterDemoMode} style={{ width:'100%', height:38, borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#9333ea)', color:'white', fontSize:13, fontWeight:600, border:'none', cursor:'pointer', boxShadow:'0 4px 12px rgba(124,58,237,0.4)' }}>
                  دخول تجريبي
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>

              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)', display:'flex' }}>
                  <Users size={16}/>
                </span>
                <input className="ms-inp" type="email" placeholder="البريد الإلكتروني" value={email}
                  onChange={e => setEmail(e.target.value)} required disabled={!isConfigured}
                  style={{ paddingRight:44, paddingLeft:14 }}/>
              </div>

              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)', display:'flex' }}>
                  <Shield size={16}/>
                </span>
                <input className="ms-inp" type={showPass ? 'text' : 'password'} placeholder="كلمة المرور"
                  value={password} onChange={e => setPassword(e.target.value)} required disabled={!isConfigured}
                  style={{ paddingRight:44, paddingLeft:44 }}/>
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.35)', background:'none', border:'none', cursor:'pointer', display:'flex' }}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    style={{ width:16, height:16, accentColor:'#7c3aed', cursor:'pointer' }}/>
                  <span style={{ color:'rgba(255,255,255,0.5)', fontSize:13 }}>تذكرني</span>
                </label>
                <button type="button" style={{ color:'#a78bfa', fontSize:13, background:'none', border:'none', cursor:'pointer' }}>
                  نسيت كلمة المرور؟
                </button>
              </div>

              {error && (
                <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'10px 14px', color:'#fca5a5', fontSize:13 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={!isConfigured || loading} style={{ width:'100%', height:50, borderRadius:12, border:'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize:16, fontWeight:700, color:'white', background:'linear-gradient(135deg,#7c3aed,#9333ea)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 6px 24px rgba(124,58,237,0.45)', opacity: (!isConfigured && false) || loading ? 0.7 : 1, marginTop:4 }}>
                {loading
                  ? <span style={{ width:20, height:20, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }}/>
                  : <><LogIn size={18}/> تسجيل الدخول</>
                }
              </button>
            </form>

            <div style={{ marginTop:20 }}>
              <p style={{ textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:13, marginBottom:14 }}>أو سجل دخولك باستخدام</p>
              <div style={{ display:'flex', gap:10 }}>
                <button className="ms-btn-social">
                  <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </button>
                <button className="ms-btn-social">
                  <svg width="16" height="16" viewBox="0 0 24 24"><rect x="1" y="1" width="10" height="10" fill="#F25022"/><rect x="13" y="1" width="10" height="10" fill="#7FBA00"/><rect x="1" y="13" width="10" height="10" fill="#00A4EF"/><rect x="13" y="13" width="10" height="10" fill="#FFB900"/></svg>
                  Microsoft
                </button>
              </div>
            </div>

            <p style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:12, marginTop:28 }}>
              © {new Date().getFullYear()} Mobile Store — All rights reserved
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
