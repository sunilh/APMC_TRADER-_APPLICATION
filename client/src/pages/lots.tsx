import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Lot {
  id: number;
  lotNumber: string;
  farmerName: string;
  cropName: string;
  totalWeight: number;
  totalBags: number;
  status: string;
}

const LotPage: React.FC = () => {
  const [lots, setLots] = useState<Lot[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchLots = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/lots", {
        params: { search },
      });
      setLots(response.data);
    } catch (error) {
      console.error("Failed to fetch lots:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      const response = await axios.get("/api/lots/print");
      const printData = response.data;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const htmlContent = `
          <html>
            <head>
              <title>Lot Print</title>
              <style>
                body { font-family: Arial; padding: 20px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #333; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
              </style>
            </head>
            <body>
              <h2>Lot Report</h2>
              <table>
                <thead>
                  <tr>
                    <th>Lot Number</th>
                    <th>Farmer Name</th>
                    <th>Crop</th>
                    <th>Total Bags</th>
                    <th>Total Weight (Kg)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${printData
                    .map(
                      (lot: Lot) => `
                    <tr>
                      <td>${lot.lotNumber}</td>
                      <td>${lot.farmerName}</td>
                      <td>${lot.cropName}</td>
                      <td>${lot.totalBags}</td>
                      <td>${lot.totalWeight}</td>
                      <td>${lot.status}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            </body>
          </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error("Failed to print lots:", error);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Lot Management</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Search lot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchLots();
            }}
          />
          <Button onClick={fetchLots}>Search</Button>
          <Button onClick={handlePrint}>Print</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot Number</TableHead>
                <TableHead>Farmer Name</TableHead>
                <TableHead>Crop</TableHead>
                <TableHead>Total Bags</TableHead>
                <TableHead>Total Weight (Kg)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.length > 0 ? (
                lots.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell>{lot.lotNumber}</TableCell>
                    <TableCell>{lot.farmerName}</TableCell>
                    <TableCell>{lot.cropName}</TableCell>
                    <TableCell>{lot.totalBags}</TableCell>
                    <TableCell>{lot.totalWeight}</TableCell>
                    <TableCell>{lot.status}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {loading ? "Loading..." : "No lots found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LotPage;
