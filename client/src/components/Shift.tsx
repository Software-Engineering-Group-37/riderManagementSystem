import { useEffect, useState } from "react";
import Menu from "./Menu";
import SmallMenu from "./SmallMenu";

const Shift = () => {
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => {
        document.title = "History - Rider Management System";
        const handleResize = () => {
            setWidth(window.innerWidth);
            console.log("Resized Width:", window.innerWidth);
        }
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [width]);
    return (
        <div className="flex h-screen overflow-hidden">
            {width > 968 ? <Menu /> : <SmallMenu />}
            <h1 className="text-2xl font-bold text-center mt-8">Shift Management</h1>
            <p className="text-center mt-4">This is the shift management page where you can manage shifts.</p>
            {/* Add your shift management content here */}
        </div>
    );
}

export default Shift;
