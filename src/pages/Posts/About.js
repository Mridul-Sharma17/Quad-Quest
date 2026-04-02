import React from "react";
import Spacer from "@components/Spacer";
import { useStyles } from "./Posts";
import { HELP_DOCUMENT, SITE_NAME } from "../../config/config";

const VPAT_LINK = `${process.env.PUBLIC_URL}/static/documents/OATutor_Sec508_WCAG.pdf`

const SOURCE_LINKS = [
    {
        label: "Siyavula Grade 8 Mathematics",
        url: "https://www.siyavula.com/read/maths/grade-8",
        note: "Primary class-8 quadrilateral content reference"
    },
    {
        label: "OpenStax Math Catalog",
        url: "https://openstax.org/subjects/math",
        note: "Secondary concept reference"
    },
    {
        label: "OpenStax License",
        url: "https://openstax.org/license",
        note: "Book-level licensing details"
    },
    {
        label: "Khan Academy NCERT Math",
        url: "https://www.khanacademy.org/math/in-math-ncert",
        note: "Sequence and pedagogy reference"
    },
    {
        label: "NCERT Textbooks",
        url: "https://ncert.nic.in/textbook.php",
        note: "Official curriculum alignment"
    }
];

const About = () => {
    const classes = useStyles()
    const currentYear = new Date().getFullYear();

    return <>
        <h2>
            About {SITE_NAME}
        </h2>
        Open Adaptive Tutor ({SITE_NAME}) is an open-source adaptive tutoring system based on Intelligent Tutoring System (ITS) Principles.
        <h3>Question Input Types & Shortcuts</h3>

        To learn more about how to fill in and submit {SITE_NAME} assignments,<span> </span>
        <a href={HELP_DOCUMENT} target={"_blank"} rel={"noreferrer"}>visit our help document</a>.

        <h3>Contributors</h3>
        
        OATutor was created and developed by a dedicated team from the Computational Approaches to Human Learning (CAHL) Research Lab at the UC Berkeley School of Education.
        
        <h3>Learn more</h3>
        <ul>
            <li>Visit <a href="https://www.oatutor.io/" target={"_blank"} rel={"noreferrer"}>https://www.oatutor.io/</a> to explore more about OATutor, our mission, and how it can benefit you.</li>
            <li>Read our <a href="https://dl.acm.org/doi/10.1145/3544548.3581574" target={"_blank"} rel={"noreferrer"}>research paper</a> to learn more about the scientific foundation and methodology behind OATutor.</li>
        </ul>

        <h3>Accessibility Standards</h3>

        <p>
            {SITE_NAME} strives to ensure an easy and accessible experience for all users, regardless of disabilities.
            The site, {SITE_NAME}, is built with the most up-to-date HTML5 and CSS3 standards; all whilst complying with
            W3C's Web Accessibility Guidelines (WCAG) and Section 508 guidelines.
        </p>

        <p className={classes["pt-2"]}>
            The Voluntary Product Accessibility Template, or VPAT, is a tool that administrators and decision-makers can
            use to evaluate {SITE_NAME}{SITE_NAME.match(/s$/i) ? "'" : "'s"} conformance with the accessibility
            standards under Section 508 of the Rehabilitation Act.
        </p>

        <p className={classes["pt-2"]}>
            You may read our most recent publication of our Voluntary Product Accessibility Template at this
            url:<span> </span>
            <a href={VPAT_LINK} target={"_blank"} rel={"noreferrer"}>{VPAT_LINK.match(/\/[^/]*$/)[0].substr(1)}</a>
        </p>

        <h3>Content Sources & Licenses</h3>
        <p>
            The links below list the source references and licensing pages used to curate our quadrilateral learning content.
        </p>
        <ul>
            {SOURCE_LINKS.map(({ label, url, note }) => (
                <li key={url}>
                    <a href={url} target={"_blank"} rel={"noreferrer"}>{label}</a>
                    <span>: {note}</span>
                </li>
            ))}
        </ul>

        <Spacer height={24 * 1}/>

        <sub>
            <p>OATutor code is licensed under a MIT Open Source License, with its adaptive learning content made available under a CC BY 4.0 license.</p> 
            <p>© {currentYear}, CAHL Research Lab, UC Berkley School of Education.</p>
        </sub>
    </>
}

export default About
