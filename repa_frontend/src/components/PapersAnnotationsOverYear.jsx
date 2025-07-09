import React, { useEffect, useState } from "react";
import axios from "axios";
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, CartesianGrid, Line } from "recharts";

const PapersAnnotationsOverYear = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(
                    "http://localhost:8000/papers_with_annotations/count_by_year"
                );
                setData(res.data);
            } catch (error) {
                console.error("Failed to fetch papers count by year:", error);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="bg-white shadow-md rounded-lg p-4 h-full">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
                Number of Papers with Annotations by Year
            </h3>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8884d8"           
                    strokeWidth={3}
                    dot={{ r: 4, stroke: "#8884d8", strokeWidth: 2, fill: "#fff" }}
                    activeDot={{ r: 6 }}
                />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PapersAnnotationsOverYear;