"use client"

import {
  useState,
  useRef,
  type JSXElementConstructor,
  type Key,
  type ReactElement,
  type ReactNode,
  type ReactPortal,
} from "react"
import type React from "react" // Added import for React
import { ChevronLeft, ChevronRight, MapPin, Building, Clock, Globe, Briefcase, DollarSign } from "lucide-react"

export default function Home() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(1)
  const [startX, setStartX] = useState<number | null>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [sheetUrl, setSheetUrl] = useState("")
  const [spreadsheetId, setSpreadsheetId] = useState("")
  const cardRef = useRef(null)

  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const RANGE = process.env.NEXT_PUBLIC_RANGE;

  // Extract spreadsheet ID from URL
  const extractSpreadsheetId = (url: string) => {
    const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    return matches ? matches[1] : null
  }

  const handleUrlSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    const id = extractSpreadsheetId(sheetUrl)
    if (id) {
      setSpreadsheetId(id)
      fetchData(id)
    } else {
      console.log("Invalid Google Sheets URL")
    }
  }

  const fetchData = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${RANGE}?key=${API_KEY}`)

      if (!response.ok) throw new Error("Failed to fetch data")

      const result = await response.json()
      const headers = result.values[0]
      const rows = result.values.slice(1)
      // Reverse the rows order but keep headers first
      setData([headers, ...rows.reverse()] as never[])
      setCurrentIndex(1)
      setLoading(false)
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message)
      setLoading(false)
    }
  }

  // Rest of the functions remain the same
  const formatDate = (dateString: string | number | Date) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch (e) {
      return dateString
    }
  }

  const parseJSON = (str: string) => {
    try {
      return JSON.parse(str)
    } catch {
      return str
    }
  }

  // Touch handlers and navigation functions remain the same
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e: { touches: { clientX: any }[] }) => {
    if (startX === null) return
    const currentX = e.touches[0].clientX
    const diff = currentX - startX
    setOffsetX(diff)
  }

  const handleTouchEnd = () => {
    if (Math.abs(offsetX) > 100) {
      if (offsetX > 0 && currentIndex > 1) {
        setCurrentIndex(currentIndex - 1)
      } else if (offsetX < 0 && currentIndex < data.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }
    setStartX(null)
    setOffsetX(0)
  }

  const navigateCard = (direction: string) => {
    if (direction === "prev" && currentIndex > 1) {
      setCurrentIndex(currentIndex - 1)
    } else if (direction === "next" && currentIndex < data.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  // Modified delete function to work with the reversed order
  const deleteRow = async () => {
    if (!confirm("Are you sure you want to delete this job posting?")) return

    try {
      setDeleting(true)
      // Calculate the actual row number in the sheet (accounting for reverse order)
      const totalRows = data.length
      const actualRowIndex = totalRows - currentIndex

      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 0,
                  dimension: "ROWS",
                  startIndex: actualRowIndex - 1,
                  endIndex: actualRowIndex,
                },
              },
            },
          ],
        }),
      })

      if (!response.ok) throw new Error("Failed to delete row")

      const newData = data.filter((_, index) => index !== currentIndex)
      setData(newData)

      if (currentIndex >= newData.length - 1) {
        setCurrentIndex(Math.max(1, newData.length - 2))
      }
    } catch (err) {
      console.error("Error deleting row:", err)
    } finally {
      setDeleting(false)
    }
  }

  if (!spreadsheetId) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">Job Database Viewer</h1>
          <form onSubmit={handleUrlSubmit} className="bg-white rounded-xl shadow-lg p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter Google Sheets URL</label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full p-2 border rounded-md mb-4"
            />
            <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
              Load Sheet
            </button>
            {error && <div className="mt-4 text-red-600">{error}</div>}
          </form>
        </div>
      </div>
    )
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    )

  const headers = data[0] || []
  const currentRow = data[currentIndex] || []
  const getFieldValue = (fieldName: string) => {
    const index = (headers as string[]).findIndex((header) => header.toLowerCase() === fieldName.toLowerCase())
    return index !== -1 ? currentRow[index] : ""
  }

  // Rest of the JSX remains the same as before
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="flex items-center justify-between mb-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateCard("prev")}
            disabled={currentIndex <= 1}
            className="p-2 rounded-full bg-blue-600 text-white shadow-md disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded-full">
            Job {currentIndex} of {data.length - 1}
          </div>

          <button
            onClick={() => navigateCard("next")}
            disabled={currentIndex >= data.length - 1}
            className="p-2 rounded-full bg-blue-600 text-white shadow-md disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <button
          onClick={() => {
            setSpreadsheetId("")
            setData([])
            setSheetUrl("")
          }}
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          Change Sheet
        </button>
      </div>

      {/* Rest of the card component remains the same */}
      <div
        ref={cardRef}
        className="max-w-2xl mx-auto bg-black text-white rounded-xl shadow-lg overflow-hidden transform transition-transform"
        style={{
          transform: `translateX(${offsetX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={(e: React.TouchEvent<HTMLDivElement>) => {
          if (startX === null) return
          const currentX = e.touches[0].clientX
          const diff = currentX - startX
          setOffsetX(diff)
        }}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-8">
          {/* Date and Delete Button */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-sm text-gray-400">
              <Clock size={16} className="inline mr-1" />
              Posted: {formatDate(getFieldValue("currentDate"))?.toString()}
            </div>
          </div>

          {/* Title and Company */}
          <h2 className="text-3xl font-bold mb-3 text-blue-400">{getFieldValue("title")}</h2>
          <div className="flex items-center gap-2 mb-6">
            <Building size={18} className="text-gray-400" />
            <span className="font-semibold text-lg">{getFieldValue("company_name")}</span>
          </div>

          {/* Key Details */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-gray-400" />
              <span className="text-gray-200">{getFieldValue("location")}</span>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase size={18} className="text-gray-400" />
              <span className="text-gray-200">{getFieldValue("type")}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-gray-400" />
              <span className="text-gray-200">{getFieldValue("experience")}+ years experience</span>
            </div>
            {getFieldValue("salary") && (
              <div className="flex items-center gap-3">
                <DollarSign size={18} className="text-gray-400" />
                <span className="text-gray-200">{getFieldValue("salary")}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-3 text-blue-400">Description</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{getFieldValue("description")}</p>
          </div>

          {/* Skills */}
          {getFieldValue("skills") && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3 text-blue-400">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {parseJSON(getFieldValue("skills")).map(
                  (
                    skill:
                      | string
                      | number
                      | bigint
                      | boolean
                      | ReactElement<unknown, string | JSXElementConstructor<any>>
                      | Iterable<ReactNode>
                      | ReactPortal
                      | Promise<
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactPortal
                          | ReactElement<unknown, string | JSXElementConstructor<any>>
                          | Iterable<ReactNode>
                          | null
                          | undefined
                        >
                      | null
                      | undefined,
                    index: Key | null | undefined,
                  ) => (
                    <span key={index} className="px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-sm">
                      {skill}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Company Website */}
          {getFieldValue("company_website") && (
            <div className="mt-8">
              <a
                href={getFieldValue("company_website")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
              >
                <Globe size={18} />
                View Job Posting
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="text-center mt-6 text-sm text-gray-400">Swipe left or right to navigate between jobs</div>
    </div>
  )
}


