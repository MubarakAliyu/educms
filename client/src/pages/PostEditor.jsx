import React,{useEffect,useState}from"react";
import{useNavigate,useParams}from"react-router-dom";
import{ArrowLeft,History,Save,RotateCcw}from"lucide-react";
import api from"../services/api";

const initial={title:"",slug:"",excerpt:"",content:"",categoryId:"",language:"en",status:"draft",featuredImage:"",metaTitle:"",metaDescription:"",metaKeywords:"",isFeatured:false,allowComments:true,tags:[]};

export default function PostEditor(){
  const {id}=useParams();
  const editing=Boolean(id);
  const nav=useNavigate();
  const [form,setForm]=useState(initial);
  const [categories,setCategories]=useState([]);
  const [tags,setTags]=useState([]);
  const [versions,setVersions]=useState([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [restoring,setRestoring]=useState(false);

  useEffect(()=>{
    const load=async()=>{
      try{
        const [c,t]=await Promise.all([api.get("/categories"),api.get("/tags")]);
        setCategories(c.data.categories||[]);
        setTags(t.data.tags||[]);
        if(editing){
          const detail=await api.get(`/posts/edit/${id}`);
          const p=detail.data.post;
          setForm({...initial,title:p.title,slug:p.slug,excerpt:p.excerpt||"",content:p.content,categoryId:p.category_id||"",language:p.language||"en",status:p.status||"draft",featuredImage:p.featured_image||"",metaTitle:p.meta_title||"",metaDescription:p.meta_description||"",metaKeywords:p.meta_keywords||"",isFeatured:Boolean(p.is_featured),allowComments:p.allow_comments!==false,tags:(p.tags||[]).filter(x=>x.id).map(x=>x.id)});
          const v=await api.get(`/posts/${id}/versions`);
          setVersions(v.data.versions||[]);
        }
      }catch(e){setError(e.response?.data?.message||"Unable to load the editor.");}
    };
    load();
  },[editing,id]);

  const change=e=>{
    const{name,value,type,checked}=e.target;
    setForm(current=>({...current,[name]:type==="checkbox"?checked:value}));
  };

  const toggleTag=tagId=>setForm(current=>({...current,tags:current.tags.includes(tagId)?current.tags.filter(x=>x!==tagId):[...current.tags,tagId]}));

  const submit=async e=>{
    e.preventDefault();
    setBusy(true);
    setError("");
    try{
      const payload={...form,categoryId:form.categoryId||null,tags:form.tags};
      if(editing)await api.put(`/posts/${id}`,payload);else await api.post("/posts",payload);
      nav("/dashboard/posts");
    }catch(e){setError(e.response?.data?.message||"Could not save post.");}
    finally{setBusy(false);}
  };

  const restore=async(versionId)=>{
    if(!window.confirm("Restore this version as a new draft?"))return;
    setRestoring(true);
    try{
      await api.post(`/posts/${id}/restore/${versionId}`);
      const detail=await api.get(`/posts/edit/${id}`);
      const p=detail.data.post;
      setForm(current=>({...current,title:p.title,slug:p.slug,excerpt:p.excerpt||"",content:p.content,categoryId:p.category_id||"",status:p.status||"draft",featuredImage:p.featured_image||"",metaTitle:p.meta_title||"",metaDescription:p.meta_description||"",metaKeywords:p.meta_keywords||"",isFeatured:Boolean(p.is_featured),allowComments:p.allow_comments!==false,tags:(p.tags||[]).filter(x=>x.id).map(x=>x.id)}));
      const v=await api.get(`/posts/${id}/versions`);setVersions(v.data.versions||[]);
    }catch(e){setError(e.response?.data?.message||"Could not restore version.");}
    finally{setRestoring(false);}
  };

  return <>
    <button type="button" onClick={()=>nav("/dashboard/posts")} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-900"><ArrowLeft size={15}/> Back to posts</button>
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_330px]">
      <div className="space-y-6">
        <div className="panel p-6 sm:p-8">
          <p className="eyebrow">{editing?"Edit post":"New post"}</p>
          <h1 className="mt-3 text-3xl font-extrabold">{editing?"Refine this article":"Create a new article"}</h1>
          {error&&<div className="mt-5 rounded-2xl bg-red-50 p-4 text-xs text-red-700">{error}</div>}
          <div className="mt-7 space-y-4">
            <input className="input text-lg font-bold" name="title" value={form.title} onChange={change} placeholder="Post title" required/>
            <input className="input" name="slug" value={form.slug} onChange={change} placeholder="Slug (optional)"/>
            <textarea className="input min-h-24" name="excerpt" value={form.excerpt} onChange={change} placeholder="Short excerpt"/>
            <textarea className="input min-h-[380px] font-mono text-xs leading-7" name="content" value={form.content} onChange={change} placeholder="Write HTML-enabled content here…" required/>
          </div>
        </div>

        <div className="panel p-6 sm:p-8">
          <h2 className="text-sm font-extrabold">SEO & publishing</h2>
          <div className="mt-5 space-y-4">
            <input className="input" name="metaTitle" value={form.metaTitle} onChange={change} placeholder="Meta title"/>
            <textarea className="input min-h-24" name="metaDescription" value={form.metaDescription} onChange={change} placeholder="Meta description"/>
            <input className="input" name="metaKeywords" value={form.metaKeywords} onChange={change} placeholder="Meta keywords"/>
            <input className="input" name="featuredImage" value={form.featuredImage} onChange={change} placeholder="Featured image URL"/>
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="panel p-6">
          <label className="text-xs font-bold text-stone-500">Status</label>
          <select className="input mt-2" name="status" value={form.status} onChange={change}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
          <label className="mt-5 block text-xs font-bold text-stone-500">Category</label>
          <select className="input mt-2" name="categoryId" value={form.categoryId} onChange={change}><option value="">Uncategorized</option>{categories.map(c=><option key={c.category_id} value={c.category_id}>{c.name}</option>)}</select>
          <label className="mt-5 block text-xs font-bold text-stone-500">Language</label>
          <select className="input mt-2" name="language" value={form.language} onChange={change}><option value="en">English</option><option value="fr">French</option><option value="ha">Hausa</option></select>
          <label className="mt-5 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={change}/> Feature this post</label>
          <label className="mt-3 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="allowComments" checked={form.allowComments} onChange={change}/> Allow comments</label>
          <button className="btn-primary mt-6 w-full" disabled={busy}>{busy?"Saving…":<><Save size={15}/> Save post</>}</button>
        </div>

        <div className="panel p-6">
          <p className="text-xs font-bold text-stone-500">Tags</p>
          <div className="mt-3 flex flex-wrap gap-2">{tags.map(tag=><button type="button" key={tag.tag_id} onClick={()=>toggleTag(tag.tag_id)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${form.tags.includes(tag.tag_id)?"bg-stone-900 text-white":"bg-stone-100 text-stone-600"}`}>{tag.name}</button>)}</div>
        </div>

        {editing&&<div className="panel p-6">
          <div className="flex items-center gap-2"><History size={16}/><p className="text-sm font-extrabold">Version history</p></div>
          <div className="mt-4 space-y-3">{versions.map(v=><div key={v.version_id} className="rounded-2xl border border-stone-200 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold">Version {v.version_number}</p><p className="mt-1 text-[10px] text-stone-400">{new Date(v.created_at).toLocaleString()}</p></div><button type="button" disabled={restoring} onClick={()=>restore(v.version_id)} className="btn-secondary px-2.5 py-2 text-[10px]"><RotateCcw size={12}/> Restore</button></div><p className="mt-2 truncate text-xs text-stone-500">{v.title}</p></div>)}{!versions.length&&<p className="text-xs text-stone-500">No saved versions yet.</p>}</div>
        </div>}
      </aside>
    </form>
  </>;
}
