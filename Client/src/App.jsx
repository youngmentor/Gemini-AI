import './App.css'
import {useEffect, useState} from "react";
import axios from "axios"

function App() {
  const [image, setImage] = useState(null)
  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)

 

  const uploadImage=async()=>{
    try{
      
        const formData = new FormData()
        formData.append('file', image)
    
        const response = await axios.post("http://localhost:3000/upload", formData)
      // const data = await response.json();
      alert(response?.data?.message)
      
  }catch(err){
    console.error(err);
    setError("something went wrong")
  }
  }

  useEffect(()=>{
    if(!image){
      console.log("No image selected")
    }else{
      uploadImage()
    }
   },[image])

  const analyzeImage=async()=>{
    
    try{
      setLoading(true)
      if(!image){
        setError("Error! Please add image");
        setLoading(false)
        return
      }else{
      const response = await axios.post('http://localhost:3000/gemini', JSON.stringify({message: value}), {headers: {"Content-Type": "application/json"}})
      const data = await response?.data;
      // console.log(response)
      setResponse(data)
      setLoading(false)
      }
    }catch(err){
      console.error(err);
      setError("Something Went wrong");
      setLoading(false)
    }
  }

  const clear =()=>{
    setError("")
    setResponse("");
    setValue("")
    setImage(null)
  }

  return (
    <div>
      {image && <img src={URL.createObjectURL(image)} style={{width: 200, height: 200}} />}
      <label htmlFor="files">Upload</label>
      <input onChange={(e)=> setImage(e.target.files[0])} id="files" accept="image/*" type="file" hidden/>
      <div>
        <p>What do you want to know about the image</p>
        <input value={value} onChange={(e)=> setValue(e.target.value)} placeholder="What is in the image..." />
        {(!response && !error) && <button onClick={analyzeImage}>{loading? "Loading...": "Ask"}</button>}
        {error && <p>{error}</p>}
        {response && <p>{response}</p>}
        <button onClick={clear}>Clear</button>
      </div>
    </div>
  )
}

export default App
