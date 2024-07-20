

import { CourseCard, CourseList } from "@components/ui/course"
import { BaseLayout } from "@components/ui/layout"
import { getAllCourses } from "@content/courses/fetcher"
import { useOwnedCourses, useWalletInfo } from "@components/hooks/web3"
import { Button, Loader, Message } from "@components/ui/common"
import { OrderModal } from "@components/ui/order"
import { useState } from "react"
import { MarketHeader } from "@components/ui/marketplace"
import { useWeb3 } from "@components/providers"

export default function Marketplace({courses}) {
  const { web3, contract, requireInstall } = useWeb3()
  const { hasConnectedWallet, isConnecting, account } = useWalletInfo()
  const { ownedCourses } = useOwnedCourses(courses, account.data)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [isNewPurchase, setIsNewPurchase] = useState(true)

  const purchaseCourse = async order => {
    const hexCourseId = web3.utils.utf8ToHex(selectedCourse.id)

    // hex course ID:
    // 0x31343130343734000000000000000000

    // address
    // 0x185BAe7ABE237a5086b40AA38e6EB4729Cf75939

    // 31343130343734000000000000000000185BAe7ABE237a5086b40AA38e6EB4729Cf75939
    // Order Hash
    // 5ddd4a7dde5235f17b0e51998d72ce2240fa1f9e329ddcb07fec6b90bf05c533
    const orderHash = web3.utils.soliditySha3(
      { type: "bytes16", value: hexCourseId },
      { type: "address", value: account.data }
    )

    // test@gmail.com
    // af257bcc3cf653863a77012256c927f26d8ab55c5bea3751063d049d0538b902

    // af257bcc3cf653863a77012256c927f26d8ab55c5bea3751063d049d0538b902

    // proof = emailhash+orderhash
    // af257bcc3cf653863a77012256c927f26d8ab55c5bea3751063d049d0538b9025ddd4a7dde5235f17b0e51998d72ce2240fa1f9e329ddcb07fec6b90bf05c533
    // proof = 034119c167c00a6b72f8ce85b584bb2d1bf30d6dddc673cfb8453a0de7a43d1e

    const value = web3.utils.toWei(String(order.price))
    if (isNewPurchase) {
      const emailHash = web3.utils.sha3(order.email)
      const proof = web3.utils.soliditySha3(
        { type: "bytes32", value: emailHash },
        { type: "bytes32", value: orderHash }
      )

      _purchaseCourse(hexCourseId, proof, value)
    } else {
      _repurchaseCourse(orderHash, value)
    }
  }

  const _purchaseCourse = async (hexCourseId, proof, value) => {
    try {
      const result = await contract.methods.purchaseCourse(
        hexCourseId,
        proof,
      ).send({from: account.data, value})
      console.log(result)
    } catch {
      console.error("Purchase course: Operation has failed.")
    }
  }

  const _repurchaseCourse = async (courseHash, value) => {
    try {
      const result = await contract.methods.repurchaseCourse(
        courseHash
      ).send({from: account.data, value})
      console.log(result)
    } catch {
      console.error("Purchase course: Operation has failed.")
    }
  }

  return (
    <>
      <MarketHeader />
      <CourseList
        courses={courses}
      >
      {course => {
        const owned = ownedCourses.lookup[course.id]
        return (
          <CourseCard
            key={course.id}
            course={course}
            state={owned?.state}
            disabled={!hasConnectedWallet}
            Footer={() => {
              if (requireInstall) {
                return (
                  <Button
                    size="sm"
                    disabled={true}
                    variant="lightPurple">
                    Install
                  </Button>
                )
              }
              if (isConnecting) {
                return (
                  <Button
                    size="sm"
                    disabled={true}
                    variant="lightPurple">
                    <Loader size="sm" />
                  </Button>
                )
              }

              if (!ownedCourses.hasInitialResponse) {
                return (
                  <div style={{height: "42px"}}></div>
                )
              }

              if (owned) {
                return (
                  <>
                    <div className="flex">
                      <Button
                        onClick={() => alert("You are owner of this course.")}
                        disabled={false}
                        size="sm"
                        variant="white">
                        Yours &#10004;
                      </Button>
                      { owned.state === "deactivated" &&
                        <div className="ml-1">
                          <Button
                            size="sm"
                            disabled={false}
                            onClick={() => {
                              setIsNewPurchase(false)
                              setSelectedCourse(course)
                            }}
                            variant="purple">
                            Fund to Activate
                          </Button>
                        </div>
                      }
                    </div>
                  </>
                )
              }

              return (
                <Button
                  onClick={() => setSelectedCourse(course)}
                  size="sm"
                  disabled={!hasConnectedWallet}
                  variant="lightPurple">
                  Purchase
                </Button>
              )}
            }
          />
        )}
      }
      </CourseList>
      { selectedCourse &&
        <OrderModal
          course={selectedCourse}
          isNewPurchase={isNewPurchase}
          onSubmit={purchaseCourse}
          onClose={() => {
            setSelectedCourse(null)
            setIsNewPurchase(true)
          }}
        />
      }
    </>
  )
}

export function getStaticProps() {
  const { data } = getAllCourses()
  return {
    props: {
      courses: data
    }
  }
}

Marketplace.Layout = BaseLayout