import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from 'date-fns';
import letterhead from "../images/mee-letterhead.png";
import signatureImage from "../images/signature.png";

const TableGenerator = () => {
    const [rows, setRows] = useState([]);
    const [title, setTitle] = useState("Generated Table");
    const [newRow, setNewRow] = useState({
      description: "",
      quantity: "",
      unitPrice: "",
      value: "",
      isSubheading: false,
      subheading: "",
      subheadingType: "subheading"
    });
    const [customerInfo, setCustomerInfo] = useState({
      name: "",
      location: "",
      date: format(new Date(), 'dd-MM-yyyy')
    });
    const [signature, setSignature] = useState(null);
    const [signDate, setSignDate] = useState(format(new Date(), 'dd-MM-yyyy'));
    const fileInputRef = useRef(null);
    const [selectedRows, setSelectedRows] = useState([]);
    const [isSelectingRows, setIsSelectingRows] = useState(false);

    useEffect(() => {
      const img = new Image();
      img.src = letterhead;
    }, []);

    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setNewRow({ ...newRow, [name]: value });
    };

  const splitIntoChunks = (array, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

  
  const addRow = () => {
    if (newRow.isSubheading && newRow.subheadingType === 'total') {
      setIsSelectingRows(true);
    } else if (newRow.isSubheading && newRow.subheadingType === 'subheading') {
      setRows([...rows, { ...newRow, description: newRow.subheading, id: Date.now() }]);
      resetNewRow();
    } else {
      // Only add the row content if it's not a subheading
      if (!newRow.isSubheading) {
        const calculatedValue = newRow.unitPrice && newRow.quantity ? Number(newRow.quantity) * Number(newRow.unitPrice) : newRow.unitPrice;
        setRows([...rows, { ...newRow, value: calculatedValue, id: Date.now() }]);
      } else {
        setRows([...rows, { ...newRow, value: '', id: Date.now() }]); // Add the subheading without other fields
      }
      resetNewRow();
    }
  };


    const resetNewRow = () => {
      setNewRow({
        description: "",
        quantity: "",
        unitPrice: "",
        value: "",
        isSubheading: false,
        subheading: "",
        subheadingType: "subheading"
      });
    };

    const handleSubheadingChange = (e) => {
      setNewRow({
        ...newRow,
        isSubheading: true,
        subheading: e.target.value,
      });
    };

    const handleSubheadingTypeChange = (type) => {
      setNewRow({
        ...newRow,
        subheadingType: type,
      });
    };

    const handleCustomerInfoChange = (e) => {
      const { name, value } = e.target;
      setCustomerInfo({ ...customerInfo, [name]: value });
    };

    const handleSignatureChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSignature(reader.result);
        };
        reader.readAsDataURL(file);
      }
    };

    const handleRowSelection = (index) => {
      setSelectedRows(prev => {
        if (prev.includes(index)) {
          return prev.filter(i => i !== index);
        } else {
          return [...prev, index];
        }
      });
    };

    const confirmTotalRow = () => {
      const totalValue = selectedRows.reduce((sum, index) => {
        return sum + (Number(rows[index].value) || 0);
      }, 0);

      const newTotalRow = {
        description: newRow.subheading,
        value: totalValue,
        isSubheading: true,
        subheadingType: 'total',
        id: Date.now(),
        totaledRows: selectedRows
      };

      setRows([...rows, newTotalRow]);
      setIsSelectingRows(false);
      setSelectedRows([]);
      resetNewRow();
    };

    const deleteRow = (indexToDelete) => {
      const updatedRows = rows.filter((row, index) => {
        if (index === indexToDelete) {
          return false;
        }
        if (row.isSubheading && row.subheadingType === 'total') {
          return !row.totaledRows.includes(indexToDelete);
        }
        return true;
      });

      const finalRows = updatedRows.map(row => {
        if (row.isSubheading && row.subheadingType === 'total') {
          const newTotaledRows = row.totaledRows
            .filter(i => i !== indexToDelete)
            .map(i => i > indexToDelete ? i - 1 : i);
          return { ...row, totaledRows: newTotaledRows };
        }
        return row;
      });

      setRows(finalRows);
    };

  const formatNumber = (num) => {
    return Number(num).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

const exportToPDF = async () => {
  const doc = new jsPDF();

  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error(`Failed to load image: ${e.message}`));
      img.src = url;
    });
  };

  try {
    const img = await loadImage(letterhead);
    const signImg = signature ? await loadImage(signature) : await loadImage(signatureImage);

    const imgProps = doc.getImageProperties(img);
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (imgWidth * imgProps.height) / imgProps.width;

    const addHeader = () => {
      doc.addImage(img, 'PNG', 0, 0, imgWidth, imgHeight);
      doc.setFontSize(12);
      doc.text(`Name: ${customerInfo.name}`, 10, pdfHeight * 0.2);
      doc.text(`Location: ${customerInfo.location}`, 10, pdfHeight * 0.2 + 7);
      doc.text(`Date: ${customerInfo.date}`, 10, pdfHeight * 0.2 + 14);

      doc.setFontSize(16);
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, (pdfWidth - titleWidth) / 2, pdfHeight * 0.25);
      doc.setLineWidth(0.5);
      doc.line((pdfWidth - titleWidth) / 2, pdfHeight * 0.25 + 1, (pdfWidth + titleWidth) / 2, pdfHeight * 0.25 + 1);
    };

    const addSignature = () => {
      const signImgProps = doc.getImageProperties(signImg);
      const signImgWidth = 50;
      const signImgHeight = (signImgWidth * signImgProps.height) / signImgProps.width;
      doc.addImage(signImg, 'PNG', pdfWidth - 60, pdfHeight - 70, signImgWidth, signImgHeight);
      doc.setFontSize(10);
      doc.text(`Date: ${signDate}`, pdfWidth - 60, pdfHeight - 45);
    };

    addHeader();

    // Split rows into chunks of 18
    const rowChunks = splitIntoChunks(rows, 18);
    
    let pageNumber = 1; // Initialize manual page number counter

    rowChunks.forEach((chunk, chunkIndex) => {
      // Create a new page for each chunk, including the first one
      if (chunkIndex > 0) {
          doc.addPage();
          addHeader(); // Re-add the header on the new page
          pageNumber++; // Increment the page number
      }

      const tableRows = chunk.map((row, index) => {
        if (row.isSubheading) {
          if (row.subheadingType === 'total') {
            return [
              { content: '', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
              { content: row.description, colSpan: 3, styles: { fontSize: 10, fontStyle: 'bold', fillColor: [220, 220, 220] } },
              { content: formatNumber(row.value), styles: { fontSize: 10, fontStyle: 'bold', lineWidth: { top: 2, right: 0, bottom: 2, left: 0 }, fillColor: [220, 220, 220] } }
            ];
          } else {
            return [
              { content: '', styles: { fontStyle: 'bold' } },
              { content: row.description, colSpan: 4, styles: { fontSize: 10, fontStyle: 'bold' } }
            ];
          }
        } else {
          return [
            (chunkIndex * 18) + index + 1, // Adjusted index for the current chunk
            row.description,
            row.quantity,
            formatNumber(row.unitPrice),
            formatNumber(row.value)
          ];
        }
      });

      // Generate the autoTable for the current chunk
      doc.autoTable({
        startY: pdfHeight * 0.3,
        head: [['No.', 'Description', 'Total QTY', 'Unit Price', 'Value']],
        body: tableRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 20, halign: 'left' },
          1: { cellWidth: 50, halign: 'left' },
          2: { cellWidth: 30, halign: 'left' },
          3: { cellWidth: 40, halign: 'left' },
          4: { cellWidth: 40, halign: 'left' }
        },
        margin: { left: 10, right: 10 },
        pageBreak: 'auto',
        rowPageBreak: 'auto',
        bodyStyles: {
          minCellHeight: 5
        },
        didDrawPage: () => {
          addSignature();
          doc.setFontSize(8);
          doc.text(`Page ${pageNumber}`, pdfWidth / 2, pdfHeight - 10, { align: "center" });
        },
      });
    });

    doc.save("mee_nigeria_table.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("An error occurred while generating the PDF. Please try again.");
  }
};




  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl mb-8">
          <h1 className="text-3xl font-bold mb-6 text-center">MEE Table Generator</h1>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-md shadow-sm p-2 mb-4"
            placeholder="Enter table title"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              name="name"
              value={customerInfo.name}
              onChange={handleCustomerInfoChange}
              className="border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Customer Name"
            />
            <input
              type="text"
              name="location"
              value={customerInfo.location}
              onChange={handleCustomerInfoChange}
              className="border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Location"
            />
            <input
              type="date"
              name="date"
              value={customerInfo.date}
              onChange={handleCustomerInfoChange}
              className="border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <form className="mb-6 space-y-4">
            <div className="grid grid-cols-6 gap-4">
              <input
                type="text"
                name="description"
                placeholder="Description"
                value={newRow.description}
                onChange={handleInputChange}
                disabled={newRow.isSubheading}
                className="col-span-2 border border-gray-300 rounded-md shadow-sm p-2"
              />
            
              <input
                type="number"
                name="quantity"
                placeholder="Total Qty"
                value={newRow.quantity}
                onChange={handleInputChange}
                disabled={newRow.isSubheading}
                className="border border-gray-300 rounded-md shadow-sm p-2"
              />
              <input
                type="number"
                name="unitPrice"
                placeholder="Unit Price"
                value={newRow.unitPrice}
                onChange={handleInputChange}
                disabled={newRow.isSubheading}
                className="border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Subheading (optional)"
                value={newRow.subheading}
                onChange={handleSubheadingChange}
                className="flex-grow border border-gray-300 rounded-md shadow-sm p-2"
              />
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleSubheadingTypeChange('subheading')}
                  className={`px-3 py-1 rounded ${
                    newRow.subheadingType === 'subheading'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Subheading
                </button>
                <button
                  type="button"
                  onClick={() => handleSubheadingTypeChange('total')}
                  className={`px-3 py-1 rounded ${
                    newRow.subheadingType === 'total'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Total
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={addRow}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add Row
            </button>
          </form>
        </div>
      
 <div className="table-style w-full max-w-4xl flex flex-col overflow-x-auto">
        <h2 className="text-xl font-bold mb-4 text-left">{title}</h2>
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                No.
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Total Qty
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Unit Price
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Value
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr key={row.id} className={row.isSubheading ? "bg-gray-100" : (index % 2 === 0 ? "bg-gray-50" : "bg-white")}>
                {row.isSubheading ? (
                  <>
                    <td colSpan={row.subheadingType === 'total' ? 4 : 5} className={`px-6 py-4 whitespace-nowrap font-semibold text-gray-900 ${row.subheadingType === 'total' ? 'text-right' : ''} ${row.subheadingType === 'total' || 'subheading' ? 'text-lg underline' : ''}`}>
                      {row.description}
                    </td>
                    {row.subheadingType === 'total' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900 border-black border-b-2 border-t-2">
                        {formatNumber(row.value)}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => deleteRow(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{row.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(row.unitPrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatNumber(row.value)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isSelectingRows ? (
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(index)}
                          onChange={() => handleRowSelection(index)}
                          disabled={row.isSubheading}
                        />
                      ) : (
                        <button
                          onClick={() => deleteRow(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        {isSelectingRows && (
          <div className="w-full max-w-4xl mt-4">
            <button
              onClick={confirmTotalRow}
              className="w-full bg-green-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Confirm Total
            </button>
          </div>
        )}

        <div className="w-full max-w-4xl mt-6 flex flex-col md:flex-row justify-between items-center">
          <div className="w-full md:w-1/2 mb-4 md:mb-0">
            <input
              type="file"
              accept="image/*"
              onChange={handleSignatureChange}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white hover:bg-gray-50"
            >
              {signature ? "Change Signature" : "Upload Signature (Optional)"}
            </button>
            {!signature && (
              <p className="text-sm text-gray-500 mt-1">Default signature will be used if not uploaded</p>
            )}
          </div>
          <div className="w-full md:w-1/2 md:ml-4">
            <input
              type="date"
              value={signDate}
              onChange={(e) => setSignDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>

        <button
          onClick={exportToPDF}
          className="mt-6 w-full max-w-4xl bg-green-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Export to PDF
        </button>
    </div>
  );
};

export default TableGenerator;